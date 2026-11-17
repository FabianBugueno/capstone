from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.medicion import Medicion
from app.models.prediccion_ml import PrediccionML
from app.schemas.prediccion_ml import (
    PrediccionMLResponse,
    RiesgoEquipoResponse,
    EstadoModeloResponse,
    EntrenamientoRequest,
    EntrenamientoResponse,
)
from app.services.detector_ml import (
    entrenar_modelos_con_historial,
    ejecutar_prediccion_completa,
    calcular_riesgo_falla,
    obtener_estado_modelo,
    cargar_modelos_desde_disco,
    generar_diagnostico_detallado,
    DIAGNOSTICOS_ELECTRICOS,
)
from app.services.reporte_excel import generar_reporte_excel
from app.services.reporte_pdf import generar_reporte_pdf

router = APIRouter(
    prefix="/ml",
    tags=["Machine Learning"],
)


@router.post(
    "/entrenar",
    response_model=EntrenamientoResponse,
    status_code=status.HTTP_200_OK,
    summary="Entrenar modelos Isolation Forest y Random Forest con datos historicos",
)
def endpoint_entrenar_modelos(
    payload: EntrenamientoRequest = EntrenamientoRequest(),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        metadata = entrenar_modelos_con_historial(
            db=db,
            limite_registros=payload.limite_registros,
            contamination=payload.contaminacion_iforest,
            n_estimators=payload.n_estimators,
        )
        return EntrenamientoResponse(
            mensaje="Modelos entrenados y almacenados correctamente.",
            modelo_version=metadata["modelo_version"],
            fecha_entrenamiento=metadata["fecha_entrenamiento"],
            registros_utilizados=metadata["total_muestras"],
            metricas={
                "isolation_forest": metadata["parametros_iforest"],
                "random_forest": {
                    "accuracy": metadata["metricas_clasificador"]["accuracy"],
                    "f1_macro": metadata["metricas_clasificador"]["f1_macro"],
                    "f1_weighted": metadata["metricas_clasificador"]["f1_weighted"],
                    "distribucion_clases": metadata["metricas_clasificador"]["distribucion_clases"],
                },
            },
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno durante el entrenamiento: {str(exc)}",
        )


@router.post(
    "/predecir/{equipo_id}",
    response_model=PrediccionMLResponse,
    status_code=status.HTTP_200_OK,
    summary="Predecir el estado actual de un equipo a partir de su ultima medicion",
)
def endpoint_predecir_equipo(
    equipo_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not cargar_modelos_desde_disco():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El sistema de analisis aun no esta activado.",
        )

    ultima_medicion = (
        db.query(Medicion)
        .filter(Medicion.equipo_id == equipo_id)
        .order_by(desc(Medicion.timestamp))
        .first()
    )

    if not ultima_medicion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontraron mediciones para el equipo con ID {equipo_id}.",
        )

    resultado = ejecutar_prediccion_completa(
        db=db,
        equipo_id=equipo_id,
        medicion=ultima_medicion,
        ventana_n=30,
        guardar_en_bd=True,
    )

    return PrediccionMLResponse(**resultado)


@router.get(
    "/riesgo/{equipo_id}",
    response_model=RiesgoEquipoResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener el score de riesgo de falla y horizonte temporal con ventana deslizante",
)
def endpoint_obtener_riesgo(
    equipo_id: int,
    ventana: int = Query(default=30, ge=5, le=200, description="Cantidad de mediciones recientes a evaluar"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        resultado_riesgo = calcular_riesgo_falla(
            db=db,
            equipo_id=equipo_id,
            ventana_n=ventana,
        )

        # Obtener ultima medicion para generar diagnostico con valores reales
        ultima_med = (
            db.query(Medicion)
            .filter(Medicion.equipo_id == equipo_id)
            .order_by(desc(Medicion.timestamp))
            .first()
        )

        diagnostico = None
        if ultima_med:
            diagnostico = generar_diagnostico_detallado(
                clase_predicha=resultado_riesgo["clase_predominante_reciente"],
                probabilidad=0.0,
                riesgo_falla=resultado_riesgo["riesgo_falla"],
                horizonte_min=resultado_riesgo["horizonte_estimado_min"],
                medicion=ultima_med,
            )

        resultado_riesgo["diagnostico"] = diagnostico
        return RiesgoEquipoResponse(**resultado_riesgo)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get(
    "/estado",
    response_model=EstadoModeloResponse,
    status_code=status.HTTP_200_OK,
    summary="Consultar el estado actual de los modelos ML, version y metricas",
)
def endpoint_estado_modelo(
    current_user=Depends(get_current_user),
):
    estado = obtener_estado_modelo()
    return EstadoModeloResponse(**estado)


@router.get(
    "/predicciones/{equipo_id}",
    response_model=List[PrediccionMLResponse],
    status_code=status.HTTP_200_OK,
    summary="Obtener el historial de predicciones almacenadas para un equipo",
)
def endpoint_historial_predicciones(
    equipo_id: int,
    limite: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    predicciones = (
        db.query(PrediccionML)
        .filter(PrediccionML.equipo_id == equipo_id)
        .order_by(desc(PrediccionML.timestamp))
        .limit(limite)
        .all()
    )
    return predicciones


@router.get(
    "/reporte/{equipo_id}",
    status_code=status.HTTP_200_OK,
    summary="Descargar reporte (Excel por defecto, o PDF) con incidencias, predicciones ML y mediciones",
)
def endpoint_descargar_reporte(
    equipo_id: int,
    formato: str = Query(
        default="excel",
        pattern="^(excel|pdf)$",
        description="Formato del reporte: excel (xlsx) o pdf",
    ),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        if formato == "pdf":
            buffer = generar_reporte_pdf(db=db, equipo_id=equipo_id)
            nombre_archivo = f"reporte_pgp_equipo_{equipo_id}.pdf"
            media_type = "application/pdf"
        else:
            buffer = generar_reporte_excel(db=db, equipo_id=equipo_id)
            nombre_archivo = f"reporte_pgp_equipo_{equipo_id}.xlsx"
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

        return StreamingResponse(
            buffer,
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={nombre_archivo}"},
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generando reporte: {str(exc)}",
        )