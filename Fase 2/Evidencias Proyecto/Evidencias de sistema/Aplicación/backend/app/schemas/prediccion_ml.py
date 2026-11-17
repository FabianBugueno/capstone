from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, ConfigDict


class DiagnosticoDetallado(BaseModel):
    titulo: str = Field(..., description="Nombre tecnico de la condicion detectada")
    descripcion: str = Field(..., description="Explicacion tecnica de la condicion")
    consecuencias_posibles: List[str] = Field(default_factory=list, description="Lista de posibles consecuencias fisicas si no se corrige")
    componentes_en_riesgo: List[str] = Field(default_factory=list, description="Componentes electricos que pueden resultar danados")
    accion_recomendada: str = Field(..., description="Accion inmediata sugerida para el personal tecnico")
    norma_referencia: str = Field(..., description="Norma electrica de referencia (IEEE, IEC, NFPA)")
    indicadores_anomalos_actuales: List[str] = Field(default_factory=list, description="Valores especificos fuera de rango en esta medicion")
    severidad_general: str = Field(..., description="baja, moderada, alta, critica")


class PrediccionMLBase(BaseModel):
    equipo_id: int
    timestamp: datetime
    clase_predicha: str = Field(..., description="Estado clasificado: normal, thd_alto, fp_bajo, sobrecarga, falla_critica")
    probabilidad: float = Field(..., ge=0.0, le=1.0, description="Probabilidad de la clase predicha (0.0000 a 1.0000)")
    riesgo_falla: float = Field(..., ge=0.0, le=1.0, description="Indice de riesgo de falla temporal (0.0000 a 1.0000)")
    horizonte_estimado_min: Optional[int] = Field(None, description="Minutos estimados hasta una posible falla critica")
    modelo_version: str = Field(..., description="Version del modelo utilizado")


class PrediccionMLCreate(PrediccionMLBase):
    pass


class PrediccionMLResponse(PrediccionMLBase):
    id: int
    es_anomalia_aislada: Optional[bool] = Field(
        default=None,
        description="Indica si Isolation Forest detecto la medicion como un outlier estadistico"
    )
    score_anomalia: Optional[float] = Field(
        default=None,
        description="Puntaje continuo de anomalia entregado por Isolation Forest"
    )
    diagnostico: Optional[DiagnosticoDetallado] = Field(
        default=None,
        description="Diagnostico tecnico detallado con consecuencias, componentes en riesgo y accion recomendada"
    )

    model_config = ConfigDict(from_attributes=True)


class RiesgoEquipoResponse(BaseModel):
    equipo_id: int
    timestamp_evaluacion: datetime
    mediciones_analizadas: int
    riesgo_falla: float = Field(..., ge=0.0, le=1.0)
    nivel_alerta: str = Field(..., description="bajo, moderado, alto, critico")
    horizonte_estimado_min: Optional[int]
    clase_predominante_reciente: str
    factores_contribuyentes: Dict[str, float]
    modelo_version: str
    diagnostico: Optional[DiagnosticoDetallado] = Field(
        default=None,
        description="Diagnostico detallado basado en la clase predominante reciente"
    )


class EstadoModeloResponse(BaseModel):
    entrenado: bool
    modelo_version: Optional[str] = None
    fecha_entrenamiento: Optional[str] = None
    total_muestras_entrenamiento: Optional[int] = None
    muestras_normales_iforest: Optional[int] = None
    clases_reconocidas: Optional[List[str]] = None
    metricas_clasificador: Optional[Dict[str, Any]] = None
    parametros_iforest: Optional[Dict[str, Any]] = None
    ruta_modelos: str


class EntrenamientoRequest(BaseModel):
    limite_registros: int = Field(default=5000, ge=100, le=100000)
    contaminacion_iforest: float = Field(default=0.05, gt=0.001, le=0.3)
    n_estimators: int = Field(default=150, ge=50, le=500)


class EntrenamientoResponse(BaseModel):
    mensaje: str
    modelo_version: str
    fecha_entrenamiento: str
    registros_utilizados: int
    metricas: Dict[str, Any]
