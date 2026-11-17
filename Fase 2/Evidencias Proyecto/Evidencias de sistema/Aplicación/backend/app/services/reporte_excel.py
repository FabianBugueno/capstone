"""
Servicio de generacion de reportes Excel para PowerGuardian Pro.
Genera un archivo .xlsx con multiples hojas: resumen, estadisticas de medicion,
incidencias, predicciones y mediciones recientes de un equipo.
"""
import io
from datetime import datetime, timezone
from typing import Optional

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.models.medicion import Medicion
from app.models.incidencia import Incidencia
from app.models.equipo import Equipo
from app.models.prediccion_ml import PrediccionML
from app.services.estadisticas_medicion import calcular_estadisticas_mediciones


# Estilos reutilizables
FONT_TITULO = Font(name="Calibri", size=14, bold=True, color="FFFFFF")
FONT_HEADER = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
FONT_NORMAL = Font(name="Calibri", size=10)
FONT_CRITICO = Font(name="Calibri", size=10, bold=True, color="CC0000")
FONT_ADVERTENCIA = Font(name="Calibri", size=10, color="CC6600")

FILL_TITULO = PatternFill(start_color="1A3C5E", end_color="1A3C5E", fill_type="solid")
FILL_HEADER = PatternFill(start_color="2E5984", end_color="2E5984", fill_type="solid")
FILL_CRITICO = PatternFill(start_color="FFCCCC", end_color="FFCCCC", fill_type="solid")
FILL_ADVERTENCIA = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid")
FILL_NORMAL = PatternFill(start_color="CCFFCC", end_color="CCFFCC", fill_type="solid")
FILL_ALTERNO = PatternFill(start_color="F2F7FB", end_color="F2F7FB", fill_type="solid")

ALIGN_CENTER = Alignment(horizontal="center", vertical="center", wrap_text=True)
ALIGN_LEFT = Alignment(horizontal="left", vertical="center", wrap_text=True)

BORDER_THIN = Border(
    left=Side(style="thin", color="CCCCCC"),
    right=Side(style="thin", color="CCCCCC"),
    top=Side(style="thin", color="CCCCCC"),
    bottom=Side(style="thin", color="CCCCCC"),
)


def _aplicar_header(ws, fila: int, columnas: list[str]):
    """Aplica estilo de encabezado a una fila."""
    for col_idx, titulo in enumerate(columnas, 1):
        celda = ws.cell(row=fila, column=col_idx, value=titulo)
        celda.font = FONT_HEADER
        celda.fill = FILL_HEADER
        celda.alignment = ALIGN_CENTER
        celda.border = BORDER_THIN


def _auto_width(ws, min_width: int = 12, max_width: int = 45):
    """Ajusta el ancho de columnas basado en el contenido."""
    for col_cells in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col_cells[0].column)
        for cell in col_cells:
            if cell.value:
                max_len = max(max_len, len(str(cell.value)))
        ws.column_dimensions[col_letter].width = min(max(max_len + 2, min_width), max_width)


def _formato_fecha(dt: Optional[datetime]) -> str:
    """Formatea un datetime a string DD/MM/YYYY HH:MM."""
    if not dt:
        return ""
    return dt.strftime("%d/%m/%Y %H:%M")


def generar_reporte_excel(
    db: Session,
    equipo_id: int,
    limite_incidencias: int = 200,
    limite_predicciones: int = 200,
    limite_mediciones: int = 100,
) -> io.BytesIO:
    """
    Genera un reporte Excel completo con 5 hojas:
    1. Resumen general del equipo
    2. Estadisticas de medicion (promedio, minimo, maximo y veces fuera de rango)
    3. Incidencias (alertas generadas por umbrales)
    4. Predicciones (historial del pronostico de fallas)
    5. Mediciones recientes (datos electricos crudos)
    """
    equipo = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    nombre_equipo = equipo.nombre if equipo else f"Equipo {equipo_id}"

    wb = Workbook()

    # =========================================================
    # HOJA 1: RESUMEN
    # =========================================================
    ws_resumen = wb.active
    ws_resumen.title = "Resumen"

    ws_resumen.merge_cells("A1:F1")
    celda_titulo = ws_resumen.cell(row=1, column=1, value="REPORTE POWERGUARDIAN PRO")
    celda_titulo.font = FONT_TITULO
    celda_titulo.fill = FILL_TITULO
    celda_titulo.alignment = ALIGN_CENTER

    ws_resumen.merge_cells("A2:F2")
    ws_resumen.cell(row=2, column=1, value=f"Equipo: {nombre_equipo} (ID: {equipo_id})")
    ws_resumen.cell(row=2, column=1).font = Font(size=11, bold=True)

    ws_resumen.merge_cells("A3:F3")
    fecha_gen = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC")
    ws_resumen.cell(row=3, column=1, value=f"Generado: {fecha_gen}")

    # Estadisticas
    total_mediciones = db.query(func.count()).select_from(Medicion).filter(
        Medicion.equipo_id == equipo_id
    ).scalar() or 0

    total_incidencias = db.query(func.count()).select_from(Incidencia).filter(
        Incidencia.equipo_id == equipo_id
    ).scalar() or 0

    incidencias_activas = db.query(func.count()).select_from(Incidencia).filter(
        Incidencia.equipo_id == equipo_id,
        Incidencia.estado == "activa"
    ).scalar() or 0

    incidencias_criticas = db.query(func.count()).select_from(Incidencia).filter(
        Incidencia.equipo_id == equipo_id,
        Incidencia.nivel == "critico"
    ).scalar() or 0

    total_predicciones = db.query(func.count()).select_from(PrediccionML).filter(
        PrediccionML.equipo_id == equipo_id
    ).scalar() or 0

    fila = 5
    _aplicar_header(ws_resumen, fila, ["Metrica", "Valor"])
    datos_resumen = [
        ("Total Mediciones", total_mediciones),
        ("Total Incidencias", total_incidencias),
        ("Incidencias Activas", incidencias_activas),
        ("Incidencias Criticas", incidencias_criticas),
        ("Total Predicciones", total_predicciones),
        ("Estado Equipo", equipo.estado if equipo else "N/D"),
        ("Ubicacion", equipo.ubicacion if equipo else "N/D"),
    ]
    for i, (metrica, valor) in enumerate(datos_resumen):
        f = fila + 1 + i
        ws_resumen.cell(row=f, column=1, value=metrica).font = FONT_NORMAL
        ws_resumen.cell(row=f, column=2, value=str(valor)).font = Font(size=10, bold=True)
        for c in range(1, 3):
            ws_resumen.cell(row=f, column=c).border = BORDER_THIN
            if i % 2 == 1:
                ws_resumen.cell(row=f, column=c).fill = FILL_ALTERNO

    # Distribucion de incidencias por tipo
    fila_dist = fila + len(datos_resumen) + 3
    ws_resumen.cell(row=fila_dist, column=1, value="Distribucion de Incidencias por Tipo").font = Font(size=11, bold=True)
    _aplicar_header(ws_resumen, fila_dist + 1, ["Tipo", "Cantidad", "Nivel Predominante"])

    dist_tipos = (
        db.query(Incidencia.tipo, func.count(), func.mode().within_group(Incidencia.nivel))
        .filter(Incidencia.equipo_id == equipo_id)
        .group_by(Incidencia.tipo)
        .order_by(func.count().desc())
        .all()
    )

    for i, (tipo, cant, nivel) in enumerate(dist_tipos):
        f = fila_dist + 2 + i
        ws_resumen.cell(row=f, column=1, value=tipo).border = BORDER_THIN
        ws_resumen.cell(row=f, column=2, value=cant).border = BORDER_THIN
        celda_nivel = ws_resumen.cell(row=f, column=3, value=nivel)
        celda_nivel.border = BORDER_THIN
        if nivel == "critico":
            celda_nivel.font = FONT_CRITICO
            celda_nivel.fill = FILL_CRITICO
        elif nivel == "advertencia":
            celda_nivel.font = FONT_ADVERTENCIA
            celda_nivel.fill = FILL_ADVERTENCIA

    _auto_width(ws_resumen)

    # =========================================================
    # HOJA 2: ESTADISTICAS DE MEDICION (informacion extra, no visible en la pagina)
    # =========================================================
    ws_est = wb.create_sheet("Estadisticas")

    ws_est.merge_cells("A1:H1")
    celda_titulo_est = ws_est.cell(
        row=1, column=1,
        value=f"Estadisticas de Medicion - Equipo: {nombre_equipo}",
    )
    celda_titulo_est.font = FONT_TITULO
    celda_titulo_est.fill = FILL_TITULO
    celda_titulo_est.alignment = ALIGN_CENTER

    stats = calcular_estadisticas_mediciones(db=db, equipo_id=equipo_id)

    ws_est.merge_cells("A2:H2")
    ws_est.cell(
        row=2, column=1,
        value=(
            f"Resumen de {stats['total_mediciones']} mediciones registradas. "
            "Promedio, minimo, maximo y veces que salio del rango permitido."
        ),
    ).font = Font(size=10, italic=True)

    headers_est = [
        "Variable", "Unidad", "Promedio", "Minimo", "Maximo",
        "Limite permitido", "Veces fuera del rango", "% fuera del rango",
    ]
    _aplicar_header(ws_est, 4, headers_est)

    for i, var in enumerate(stats["variables"]):
        f = 5 + i
        ws_est.cell(row=f, column=1, value=var["variable"]).border = BORDER_THIN
        ws_est.cell(row=f, column=2, value=var["unidad"]).border = BORDER_THIN
        ws_est.cell(row=f, column=3, value=round(var["promedio"], 3) if var["promedio"] is not None else None).border = BORDER_THIN
        ws_est.cell(row=f, column=4, value=round(var["minimo"], 3) if var["minimo"] is not None else None).border = BORDER_THIN
        ws_est.cell(row=f, column=5, value=round(var["maximo"], 3) if var["maximo"] is not None else None).border = BORDER_THIN
        ws_est.cell(row=f, column=6, value=var["limite"]).border = BORDER_THIN

        celda_fuera = ws_est.cell(row=f, column=7, value=var["fuera_rango"])
        celda_fuera.border = BORDER_THIN
        celda_pct = ws_est.cell(row=f, column=8, value=var["pct_fuera"])
        celda_pct.border = BORDER_THIN

        # Semáforo: rojo si mas del 10% fuera de rango, ambar si hay alguna
        pct = var["pct_fuera"]
        if pct is not None and pct > 0:
            if pct >= 10:
                for c in (7, 8):
                    ws_est.cell(row=f, column=c).font = FONT_CRITICO
                    ws_est.cell(row=f, column=c).fill = FILL_CRITICO
            else:
                for c in (7, 8):
                    ws_est.cell(row=f, column=c).font = FONT_ADVERTENCIA
                    ws_est.cell(row=f, column=c).fill = FILL_ADVERTENCIA

        if i % 2 == 1:
            for c in range(1, 7):
                if (
                    not ws_est.cell(row=f, column=c).fill
                    or ws_est.cell(row=f, column=c).fill.start_color.rgb == "00000000"
                ):
                    ws_est.cell(row=f, column=c).fill = FILL_ALTERNO

    _auto_width(ws_est)

    # =========================================================
    # HOJA 3: INCIDENCIAS
    # =========================================================
    ws_inc = wb.create_sheet("Incidencias")

    headers_inc = ["ID", "Fecha", "Tipo", "Nivel", "Estado", "Descripcion", "Valor Medido", "Umbral"]
    _aplicar_header(ws_inc, 1, headers_inc)

    incidencias = (
        db.query(Incidencia)
        .filter(Incidencia.equipo_id == equipo_id)
        .order_by(desc(Incidencia.timestamp))
        .limit(limite_incidencias)
        .all()
    )

    for i, inc in enumerate(incidencias):
        f = i + 2
        ws_inc.cell(row=f, column=1, value=inc.id).border = BORDER_THIN
        ws_inc.cell(row=f, column=2, value=_formato_fecha(inc.timestamp)).border = BORDER_THIN
        ws_inc.cell(row=f, column=3, value=inc.tipo).border = BORDER_THIN

        celda_nivel = ws_inc.cell(row=f, column=4, value=inc.nivel)
        celda_nivel.border = BORDER_THIN
        if inc.nivel == "critico":
            celda_nivel.font = FONT_CRITICO
            celda_nivel.fill = FILL_CRITICO
        elif inc.nivel == "advertencia":
            celda_nivel.font = FONT_ADVERTENCIA
            celda_nivel.fill = FILL_ADVERTENCIA

        celda_estado = ws_inc.cell(row=f, column=5, value=inc.estado)
        celda_estado.border = BORDER_THIN
        if inc.estado == "activa":
            celda_estado.fill = FILL_CRITICO
        elif inc.estado == "resuelta":
            celda_estado.fill = FILL_NORMAL

        ws_inc.cell(row=f, column=6, value=inc.descripcion).border = BORDER_THIN
        ws_inc.cell(row=f, column=7, value=float(inc.valor_medido) if inc.valor_medido else None).border = BORDER_THIN
        ws_inc.cell(row=f, column=8, value=float(inc.umbral_config) if inc.umbral_config else None).border = BORDER_THIN

        if i % 2 == 1:
            for c in range(1, 9):
                if not ws_inc.cell(row=f, column=c).fill or ws_inc.cell(row=f, column=c).fill.start_color.rgb == "00000000":
                    ws_inc.cell(row=f, column=c).fill = FILL_ALTERNO

    _auto_width(ws_inc)

    # =========================================================
    # HOJA 4: PREDICCIONES (HISTORIAL)
    # =========================================================
    ws_pred = wb.create_sheet("Predicciones")

    headers_pred = ["ID", "Fecha", "Estado detectado", "Confianza (%)", "Riesgo de falla (%)", "Tiempo hasta falla (min)", "Version"]
    _aplicar_header(ws_pred, 1, headers_pred)

    predicciones = (
        db.query(PrediccionML)
        .filter(PrediccionML.equipo_id == equipo_id)
        .order_by(desc(PrediccionML.timestamp))
        .limit(limite_predicciones)
        .all()
    )

    for i, pred in enumerate(predicciones):
        f = i + 2
        ws_pred.cell(row=f, column=1, value=pred.id).border = BORDER_THIN
        ws_pred.cell(row=f, column=2, value=_formato_fecha(pred.timestamp)).border = BORDER_THIN

        celda_clase = ws_pred.cell(row=f, column=3, value=pred.clase_predicha)
        celda_clase.border = BORDER_THIN
        if pred.clase_predicha == "falla_critica":
            celda_clase.font = FONT_CRITICO
            celda_clase.fill = FILL_CRITICO
        elif pred.clase_predicha == "normal":
            celda_clase.fill = FILL_NORMAL
        elif pred.clase_predicha in ("thd_alto", "sobrecarga", "fp_bajo"):
            celda_clase.font = FONT_ADVERTENCIA
            celda_clase.fill = FILL_ADVERTENCIA

        prob = float(pred.probabilidad) * 100 if pred.probabilidad else 0
        ws_pred.cell(row=f, column=4, value=round(prob, 2)).border = BORDER_THIN

        riesgo = float(pred.riesgo_falla) * 100 if pred.riesgo_falla else 0
        celda_riesgo = ws_pred.cell(row=f, column=5, value=round(riesgo, 2))
        celda_riesgo.border = BORDER_THIN
        if riesgo >= 75:
            celda_riesgo.fill = FILL_CRITICO
        elif riesgo >= 50:
            celda_riesgo.fill = FILL_ADVERTENCIA

        ws_pred.cell(row=f, column=6, value=pred.horizonte_estimado_min).border = BORDER_THIN
        ws_pred.cell(row=f, column=7, value=pred.modelo_version).border = BORDER_THIN

        if i % 2 == 1:
            for c in range(1, 8):
                if not ws_pred.cell(row=f, column=c).fill or ws_pred.cell(row=f, column=c).fill.start_color.rgb == "00000000":
                    ws_pred.cell(row=f, column=c).fill = FILL_ALTERNO

    _auto_width(ws_pred)

    # =========================================================
    # HOJA 5: MEDICIONES RECIENTES
    # =========================================================
    ws_med = wb.create_sheet("Mediciones")

    headers_med = [
        "Fecha", "V-L1 (V)", "V-L2 (V)", "V-L3 (V)",
        "I-L1 (A)", "I-L2 (A)", "I-L3 (A)",
        "THD (%)", "Frecuencia (Hz)", "FP", "Temp (C)", "Estado"
    ]
    _aplicar_header(ws_med, 1, headers_med)

    mediciones = (
        db.query(Medicion)
        .filter(Medicion.equipo_id == equipo_id)
        .order_by(desc(Medicion.timestamp))
        .limit(limite_mediciones)
        .all()
    )

    for i, med in enumerate(mediciones):
        f = i + 2
        valores = [
            _formato_fecha(med.timestamp),
            float(med.voltaje_l1) if med.voltaje_l1 else None,
            float(med.voltaje_l2) if med.voltaje_l2 else None,
            float(med.voltaje_l3) if med.voltaje_l3 else None,
            float(med.corriente_l1) if med.corriente_l1 else None,
            float(med.corriente_l2) if med.corriente_l2 else None,
            float(med.corriente_l3) if med.corriente_l3 else None,
            float(med.thd) if med.thd else None,
            float(med.frecuencia) if med.frecuencia else None,
            float(med.factor_potencia) if med.factor_potencia else None,
            float(med.temperatura_gabinete) if med.temperatura_gabinete else None,
            med.estado_medicion,
        ]
        for c, val in enumerate(valores, 1):
            celda = ws_med.cell(row=f, column=c, value=val)
            celda.border = BORDER_THIN
            celda.font = FONT_NORMAL

        if i % 2 == 1:
            for c in range(1, len(headers_med) + 1):
                ws_med.cell(row=f, column=c).fill = FILL_ALTERNO

    _auto_width(ws_med)

    # Guardar en buffer de memoria
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer
