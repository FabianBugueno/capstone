"""
Servicio de generacion de reportes PDF para PowerGuardian Pro.
Genera un archivo .pdf con las mismas secciones que el reporte Excel:
1. Resumen general del equipo
2. Estadisticas de medicion (promedio, minimo, maximo y veces fuera de rango)
3. Incidencias (alertas generadas por umbrales)
4. Predicciones (historial del pronostico de fallas)
5. Mediciones recientes (datos electricos crudos)
"""
import io
from datetime import datetime, timezone
from typing import Optional

from fpdf import FPDF
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.models.medicion import Medicion
from app.models.incidencia import Incidencia
from app.models.equipo import Equipo
from app.models.prediccion_ml import PrediccionML
from app.services.estadisticas_medicion import calcular_estadisticas_mediciones


# Paleta consistente con el reporte Excel / UI PowerGuardian
AZUL_TITULO = (26, 60, 94)      # 1A3C5E
AZUL_HEADER = (46, 89, 132)     # 2E5984
ROJO_FONDO = (255, 204, 204)    # FFCCCC
AMBAR_FONDO = (255, 242, 204)   # F2CC
VERDE_FONDO = (204, 255, 204)   # CCFFCC
GRIS_ALTERNO = (242, 247, 251)  # F2F7FB
TEXTO_ROJO = (204, 0, 0)
TEXTO_AMBAR = (204, 102, 0)
TEXTO_GRIS = (90, 90, 90)


def _seguro(texto: str) -> str:
    """Convierte un texto a una cadena codificable en latin-1 (fuentes core de FPDF)."""
    if texto is None:
        return ""
    mapa = {
        "\u2013": "-", "\u2014": "-", "\u2018": "'", "\u2019": "'",
        "\u201c": '"', "\u201d": '"', "\u2022": "-", "\u2026": "...",
        "\u2264": "<=", "\u2265": ">=", "\u00a0": " ",
    }
    texto = str(texto)
    for k, v in mapa.items():
        texto = texto.replace(k, v)
    return texto.encode("latin-1", "replace").decode("latin-1")


def _formato_fecha(dt: Optional[datetime]) -> str:
    if not dt:
        return ""
    return dt.strftime("%d/%m/%Y %H:%M")


class _TablaPDF:
    """
    Dibujador de tablas simples con paginacion automatica, colores por celda
    y truncado de texto largo (espejo del estilo del reporte Excel).
    """

    def __init__(self, pdf: FPDF, anchos: list[float], margen_inf: float = 18.0):
        self.pdf = pdf
        self.anchos = anchos
        self.margen_inf = margen_inf
        self.alto_fila = 6.0
        self.alto_header = 7.0

    def _cortar(self, texto: str, ancho: float) -> str:
        pdf = self.pdf
        if pdf.get_string_width(texto) <= ancho:
            return texto
        while texto and pdf.get_string_width(texto + "...") > ancho:
            texto = texto[:-1]
        return texto + "..."

    def _fila(self, celdas: list[tuple[str, tuple, tuple]], alto: float, es_header: bool = False):
        """Dibuja una fila. Cada celda es (texto, color_fondo, color_texto)."""
        pdf = self.pdf
        if pdf.get_y() + alto > pdf.h - self.margen_inf:
            pdf.add_page()
        x0, y0 = pdf.get_x(), pdf.get_y()
        for (texto, fondo, color_txt), ancho in zip(celdas, self.anchos):
            pdf.set_fill_color(*fondo)
            pdf.set_text_color(*color_txt)
            pdf.rect(x0, y0, ancho, alto, style="F")
            pdf.set_xy(x0 + 0.8, y0)
            pdf.cell(ancho - 1.6, alto, self._cortar(texto, ancho - 2.4), align="L" if not es_header else "C")
            x0 += ancho
        pdf.set_xy(self.pdf.l_margin, y0 + alto)

    def header(self, titulos: list[str]):
        pdf = self.pdf
        pdf.set_font("helvetica", "B", 9)
        self._fila(
            [(t, AZUL_HEADER, (255, 255, 255)) for t in titulos],
            self.alto_header,
            es_header=True,
        )
        pdf.set_font("helvetica", "", 10)

    def row(self, textos: list[str], colores: Optional[dict[int, tuple[tuple, tuple]]] = None, idx_fila: int = 0):
        """Dibuja una fila de datos. `colores` mapea indice de celda -> (fondo, texto)."""
        colores = colores or {}
        celdas = []
        for i, t in enumerate(textos):
            fondo, color_txt = colores.get(i, (GRIS_ALTERNO if idx_fila % 2 == 1 else (255, 255, 255), (40, 40, 40)))
            celdas.append((_seguro(t), fondo, color_txt))
        self._fila(celdas, self.alto_fila)


class _ReportePDF(FPDF):
    nombre_equipo: str = ""
    fecha_gen: str = ""

    def header(self):
        # Banda de encabezado en todas las paginas
        self.set_fill_color(*AZUL_TITULO)
        self.rect(0, 0, self.w, 14, style="F")
        self.set_xy(self.l_margin, 3)
        self.set_font("helvetica", "B", 13)
        self.set_text_color(255, 255, 255)
        self.cell(0, 8, _seguro("PowerGuardian Pro - Reporte de Incidencias y Predicciones"), align="L")
        self.set_font("helvetica", "", 9)
        self.set_xy(self.l_margin, 3)
        self.cell(0, 8, _seguro(f"Equipo: {self.nombre_equipo}"), align="R")
        self.set_y(18)

    def footer(self):
        self.set_y(-15)
        self.set_font("helvetica", "", 8)
        self.set_text_color(*TEXTO_GRIS)
        self.cell(0, 6, _seguro(f"Generado: {self.fecha_gen}"), align="L")
        self.cell(0, 6, f"Pagina {self.page_no()}/{{nb}}", align="R")

    def _seccion(self, titulo: str):
        self.set_font("helvetica", "B", 12)
        self.set_text_color(*AZUL_TITULO)
        self.ln(4)
        self.cell(0, 8, _seguro(titulo), align="L")
        self.ln(8)
        self.set_draw_color(*AZUL_HEADER)
        self.set_line_width(0.5)
        y = self.get_y()
        self.line(self.l_margin, y, self.w - self.r_margin, y)
        self.ln(3)

    def _par(self, etiqueta: str, valor: str, destacado: bool = False):
        self.set_font("helvetica", "B" if destacado else "", 10)
        self.set_text_color(40, 40, 40)
        ancho_etq = 52
        self.cell(ancho_etq, 6, _seguro(etiqueta), align="L")
        self.set_font("helvetica", "", 10)
        self.set_text_color(*((TEXTO_ROJO if destacado else (40, 40, 40))))
        self.cell(0, 6, _seguro(valor), align="L")
        self.ln(6)


def generar_reporte_pdf(
    db: Session,
    equipo_id: int,
    limite_incidencias: int = 200,
    limite_predicciones: int = 200,
    limite_mediciones: int = 100,
) -> io.BytesIO:
    """
    Genera un reporte PDF completo (4 secciones) y lo devuelve en un BytesIO.
    """
    equipo = db.query(Equipo).filter(Equipo.id == equipo_id).first()
    nombre_equipo = equipo.nombre if equipo else f"Equipo {equipo_id}"
    fecha_gen = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M UTC")

    pdf = _ReportePDF(orientation="L", unit="mm", format="A4")  # apaisado: tablas anchas
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.set_margins(12, 20, 12)
    pdf.nombre_equipo = f"{nombre_equipo} (ID: {equipo_id})"
    pdf.fecha_gen = fecha_gen
    pdf.add_page()
    pdf.set_font("helvetica", "", 10)

    # =========================================================
    # SECCION 1: RESUMEN
    # =========================================================
    pdf._seccion("1. Resumen General")
    pdf._par("Equipo:", f"{nombre_equipo} (ID: {equipo_id})", destacado=False)
    pdf._par("Generado:", fecha_gen)
    pdf._par("Estado:", equipo.estado if equipo else "N/D")
    pdf._par("Ubicacion:", equipo.ubicacion if equipo else "N/D")
    pdf.ln(2)

    total_mediciones = (
        db.query(func.count()).select_from(Medicion).filter(Medicion.equipo_id == equipo_id).scalar() or 0
    )
    total_incidencias = (
        db.query(func.count()).select_from(Incidencia).filter(Incidencia.equipo_id == equipo_id).scalar() or 0
    )
    incidencias_activas = (
        db.query(func.count())
        .select_from(Incidencia)
        .filter(Incidencia.equipo_id == equipo_id, Incidencia.estado == "activa")
        .scalar()
        or 0
    )
    incidencias_criticas = (
        db.query(func.count())
        .select_from(Incidencia)
        .filter(Incidencia.equipo_id == equipo_id, Incidencia.nivel == "critico")
        .scalar()
        or 0
    )
    total_predicciones = (
        db.query(func.count()).select_from(PrediccionML).filter(PrediccionML.equipo_id == equipo_id).scalar() or 0
    )

    tabla = _TablaPDF(pdf, [70, 60])
    tabla.header(["Metrica", "Valor"])
    metricas = [
        ("Total Mediciones", str(total_mediciones)),
        ("Total Incidencias", str(total_incidencias)),
        ("Incidencias Activas", str(incidencias_activas)),
        ("Incidencias Criticas", str(incidencias_criticas)),
        ("Total Predicciones", str(total_predicciones)),
    ]
    for i, (m, v) in enumerate(metricas):
        colores = {}
        if m == "Incidencias Criticas" and incidencias_criticas > 0:
            colores = {0: (ROJO_FONDO, TEXTO_ROJO), 1: (ROJO_FONDO, TEXTO_ROJO)}
        elif m == "Incidencias Activas" and incidencias_activas > 0:
            colores = {0: (AMBAR_FONDO, TEXTO_AMBAR), 1: (AMBAR_FONDO, TEXTO_AMBAR)}
        tabla.row([m, v], colores=colores, idx_fila=i)

    pdf.ln(4)
    pdf.set_font("helvetica", "B", 11)
    pdf.set_text_color(*AZUL_TITULO)
    pdf.cell(0, 7, "Distribucion de Incidencias por Tipo", align="L")
    pdf.ln(8)

    dist_tipos = (
        db.query(Incidencia.tipo, func.count(), func.mode().within_group(Incidencia.nivel))
        .filter(Incidencia.equipo_id == equipo_id)
        .group_by(Incidencia.tipo)
        .order_by(func.count().desc())
        .all()
    )
    tabla_dist = _TablaPDF(pdf, [90, 40, 60])
    tabla_dist.header(["Tipo", "Cantidad", "Nivel Predominante"])
    for i, (tipo, cant, nivel) in enumerate(dist_tipos):
        colores = {}
        if nivel == "critico":
            colores = {2: (ROJO_FONDO, TEXTO_ROJO)}
        elif nivel == "advertencia":
            colores = {2: (AMBAR_FONDO, TEXTO_AMBAR)}
        tabla_dist.row([tipo or "", str(cant), nivel or ""], colores=colores, idx_fila=i)
    if not dist_tipos:
        tabla_dist.row(["Sin incidencias registradas", "0", "-"], idx_fila=0)

    # =========================================================
    # SECCION 2: ESTADISTICAS DE MEDICION (informacion extra, no visible en la pagina)
    # =========================================================
    pdf.add_page()
    pdf._seccion("2. Estadisticas de Medicion")

    stats = calcular_estadisticas_mediciones(db=db, equipo_id=equipo_id)
    pdf.set_font("helvetica", "", 10)
    pdf.set_text_color(70, 70, 70)
    pdf.multi_cell(
        0, 5,
        _seguro(
            f"Resumen de {stats['total_mediciones']} mediciones registradas del equipo: "
            "promedio, minimo y maximo de cada variable, y cuantas veces quedo fuera "
            "del rango permitido por el sistema."
        ),
    )
    pdf.ln(2)

    tabla_est = _TablaPDF(pdf, [54, 16, 26, 26, 26, 50, 38, 30])
    tabla_est.header([
        "Variable", "Unidad", "Promedio", "Minimo", "Maximo",
        "Limite permitido", "Veces fuera de rango", "% fuera",
    ])
    for i, var in enumerate(stats["variables"]):
        def _num(valor, dec=2):
            return f"{valor:.{dec}f}" if valor is not None else "-"

        colores = {}
        pct = var["pct_fuera"]
        if pct is not None and pct > 0:
            tono = (ROJO_FONDO, TEXTO_ROJO) if pct >= 10 else (AMBAR_FONDO, TEXTO_AMBAR)
            colores = {6: tono, 7: tono}

        tabla_est.row(
            [
                var["variable"],
                var["unidad"] or "-",
                _num(var["promedio"], 3),
                _num(var["minimo"], 3),
                _num(var["maximo"], 3),
                var["limite"],
                "-" if var["fuera_rango"] is None else str(var["fuera_rango"]),
                "-" if pct is None else f"{pct:.1f}%",
            ],
            colores=colores,
            idx_fila=i,
        )

    # =========================================================
    # SECCION 3: INCIDENCIAS
    # =========================================================
    pdf.add_page()
    pdf._seccion("3. Incidencias")

    incidencias = (
        db.query(Incidencia)
        .filter(Incidencia.equipo_id == equipo_id)
        .order_by(desc(Incidencia.timestamp))
        .limit(limite_incidencias)
        .all()
    )

    tabla_inc = _TablaPDF(pdf, [16, 34, 44, 26, 26, 76, 22, 22])
    tabla_inc.header(["ID", "Fecha", "Tipo", "Nivel", "Estado", "Descripcion", "Valor Med.", "Umbral"])

    def _color_nivel(nivel: str):
        if nivel == "critico":
            return (ROJO_FONDO, TEXTO_ROJO)
        if nivel == "advertencia":
            return (AMBAR_FONDO, TEXTO_AMBAR)
        return (VERDE_FONDO, (0, 120, 0))

    def _color_estado(estado: str):
        if estado == "activa":
            return (ROJO_FONDO, TEXTO_ROJO)
        if estado == "resuelta":
            return (VERDE_FONDO, (0, 120, 0))
        return (AMBAR_FONDO, TEXTO_AMBAR)

    for i, inc in enumerate(incidencias):
        tabla_inc.row(
            [
                str(inc.id),
                _formato_fecha(inc.timestamp),
                inc.tipo or "",
                inc.nivel or "",
                inc.estado or "",
                inc.descripcion or "",
                f"{float(inc.valor_medido):.2f}" if inc.valor_medido is not None else "-",
                f"{float(inc.umbral_config):.2f}" if inc.umbral_config is not None else "-",
            ],
            colores={3: _color_nivel(inc.nivel), 4: _color_estado(inc.estado)},
            idx_fila=i,
        )
    if not incidencias:
        tabla_inc.row(["-", "-", "Sin incidencias registradas", "-", "-", "", "-", "-"], idx_fila=0)

    # =========================================================
    # SECCION 4: PREDICCIONES (HISTORIAL)
    # =========================================================
    pdf.add_page()
    pdf._seccion("4. Predicciones (Historial del Pronostico de Fallas)")

    predicciones = (
        db.query(PrediccionML)
        .filter(PrediccionML.equipo_id == equipo_id)
        .order_by(desc(PrediccionML.timestamp))
        .limit(limite_predicciones)
        .all()
    )

    tabla_pred = _TablaPDF(pdf, [16, 34, 46, 30, 36, 54, 32])
    tabla_pred.header([
        "ID", "Fecha", "Estado detectado", "Confianza (%)",
        "Riesgo de falla (%)", "Tiempo hasta falla (min)", "Version",
    ])

    def _color_clase(clase: str):
        if clase == "falla_critica":
            return (ROJO_FONDO, TEXTO_ROJO)
        if clase == "normal":
            return (VERDE_FONDO, (0, 120, 0))
        if clase in ("thd_alto", "sobrecarga", "fp_bajo"):
            return (AMBAR_FONDO, TEXTO_AMBAR)
        return (GRIS_ALTERNO, (40, 40, 40))

    for i, pred in enumerate(predicciones):
        prob = float(pred.probabilidad) * 100 if pred.probabilidad else 0.0
        riesgo = float(pred.riesgo_falla) * 100 if pred.riesgo_falla else 0.0
        colores = {2: _color_clase(pred.clase_predicha)}
        if riesgo >= 75:
            colores[4] = (ROJO_FONDO, TEXTO_ROJO)
        elif riesgo >= 50:
            colores[4] = (AMBAR_FONDO, TEXTO_AMBAR)
        tabla_pred.row(
            [
                str(pred.id),
                _formato_fecha(pred.timestamp),
                pred.clase_predicha or "",
                f"{prob:.2f}",
                f"{riesgo:.2f}",
                str(pred.horizonte_estimado_min) if pred.horizonte_estimado_min is not None else "-",
                pred.modelo_version or "",
            ],
            colores=colores,
            idx_fila=i,
        )
    if not predicciones:
        tabla_pred.row(["-", "-", "Aun no hay predicciones registradas", "-", "-", "-", "-"], idx_fila=0)

    # =========================================================
    # SECCION 5: MEDICIONES RECIENTES
    # =========================================================
    pdf.add_page()
    pdf._seccion("5. Mediciones Recientes")

    mediciones = (
        db.query(Medicion)
        .filter(Medicion.equipo_id == equipo_id)
        .order_by(desc(Medicion.timestamp))
        .limit(limite_mediciones)
        .all()
    )

    ancho_med = 19.5
    tabla_med = _TablaPDF(pdf, [34] + [ancho_med] * 11)
    tabla_med.header([
        "Fecha", "V-L1 (V)", "V-L2 (V)", "V-L3 (V)",
        "I-L1 (A)", "I-L2 (A)", "I-L3 (A)",
        "THD (%)", "Frec (Hz)", "FP", "Temp (C)", "Estado",
    ])

    for i, med in enumerate(mediciones):
        tabla_med.row(
            [
                _formato_fecha(med.timestamp),
                f"{float(med.voltaje_l1):.2f}" if med.voltaje_l1 is not None else "-",
                f"{float(med.voltaje_l2):.2f}" if med.voltaje_l2 is not None else "-",
                f"{float(med.voltaje_l3):.2f}" if med.voltaje_l3 is not None else "-",
                f"{float(med.corriente_l1):.2f}" if med.corriente_l1 is not None else "-",
                f"{float(med.corriente_l2):.2f}" if med.corriente_l2 is not None else "-",
                f"{float(med.corriente_l3):.2f}" if med.corriente_l3 is not None else "-",
                f"{float(med.thd):.2f}" if med.thd is not None else "-",
                f"{float(med.frecuencia):.2f}" if med.frecuencia is not None else "-",
                f"{float(med.factor_potencia):.3f}" if med.factor_potencia is not None else "-",
                f"{float(med.temperatura_gabinete):.1f}" if med.temperatura_gabinete is not None else "-",
                med.estado_medicion or "-",
            ],
            idx_fila=i,
        )
    if not mediciones:
        tabla_med.row(["Sin mediciones registradas"] + ["-"] * 11, idx_fila=0)

    # Guardar en buffer de memoria
    buffer = io.BytesIO()
    pdf.output(buffer)
    buffer.seek(0)
    return buffer
