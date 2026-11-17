"""
Estadisticas de mediciones para los reportes de PowerGuardian Pro.

Por cada variable electrica calcula promedio, minimo, maximo y cuantas veces
salio del rango permitido. Es informacion resumida que NO se muestra en las
paginas de la aplicacion, pensada para gerencia y jefatura de mantenimiento.

Los limites se toman de la configuracion del equipo (parametros_config) y, si
el equipo no tiene configuracion, se usan los mismos umbrales por defecto que
usa el sistema para generar alertas.
"""
from typing import Optional

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.medicion import Medicion
from app.models.parametros_config import ParametrosConfig

# Mismos umbrales por defecto que app.services.en_vivo.UMBRALES_DEFECTO
UMBRALES_POR_DEFECTO = dict(
    voltaje_max=240,
    voltaje_min=210,
    thd_max=5,
    corriente_max=100,
    factor_potencia_min=0.9,
    frecuencia_nominal=50,
)

# Tolerancia de frecuencia: +/- 0.5 Hz sobre la nominal (grafico oficial 49.5 - 50.5 Hz)
TOLERANCIA_FRECUENCIA = 0.5

# (nombre visible, columna, unidad, tipo de limite)
VARIABLES = [
    ("Voltaje L1", "voltaje_l1", "V", "voltaje"),
    ("Voltaje L2", "voltaje_l2", "V", "voltaje"),
    ("Voltaje L3", "voltaje_l3", "V", "voltaje"),
    ("Corriente L1", "corriente_l1", "A", "corriente"),
    ("Corriente L2", "corriente_l2", "A", "corriente"),
    ("Corriente L3", "corriente_l3", "A", "corriente"),
    ("THD (distorsion armonica)", "thd", "%", "thd"),
    ("Factor de potencia", "factor_potencia", "", "fp"),
    ("Frecuencia", "frecuencia", "Hz", "frecuencia"),
    ("Temperatura del gabinete", "temperatura_gabinete", "\u00b0C", "sin_limite"),
]


def _umbrales_equipo(db: Session, equipo_id: int) -> dict:
    umb = dict(UMBRALES_POR_DEFECTO)
    cfg = (
        db.query(ParametrosConfig)
        .filter(ParametrosConfig.equipo_id == equipo_id)
        .first()
    )
    if cfg:
        for clave in umb:
            valor = getattr(cfg, clave, None)
            if valor is not None:
                umb[clave] = float(valor)
    return umb


def _condicion_fuera(tipo: str, columna, umb: dict):
    """Condicion SQL: la medicion quedo fuera del rango permitido."""
    if tipo == "voltaje":
        return or_(columna < umb["voltaje_min"], columna > umb["voltaje_max"])
    if tipo == "corriente":
        return columna > umb["corriente_max"]
    if tipo == "thd":
        return columna > umb["thd_max"]
    if tipo == "fp":
        return columna < umb["factor_potencia_min"]
    if tipo == "frecuencia":
        nominal = umb["frecuencia_nominal"]
        return or_(
            columna < nominal - TOLERANCIA_FRECUENCIA,
            columna > nominal + TOLERANCIA_FRECUENCIA,
        )
    return None  # sin limite definido (temperatura)


def _texto_limite(tipo: str, umb: dict) -> str:
    if tipo == "voltaje":
        return f"{umb['voltaje_min']:.0f} - {umb['voltaje_max']:.0f} V"
    if tipo == "corriente":
        return f"Maximo {umb['corriente_max']:.0f} A"
    if tipo == "thd":
        return f"Maximo {umb['thd_max']:.0f} %"
    if tipo == "fp":
        return f"Minimo {umb['factor_potencia_min']:.2f}"
    if tipo == "frecuencia":
        nominal = umb["frecuencia_nominal"]
        return f"{nominal - TOLERANCIA_FRECUENCIA:.1f} - {nominal + TOLERANCIA_FRECUENCIA:.1f} Hz"
    return "Sin limite establecido"


def calcular_estadisticas_mediciones(db: Session, equipo_id: int) -> dict:
    """
    Estadisticas por variable de TODAS las mediciones del equipo.

    Retorna:
      {
        "total_mediciones": int,
        "variables": [
          {
            "variable": str, "unidad": str,
            "promedio": float|None, "minimo": float|None, "maximo": float|None,
            "limite": str,
            "fuera_rango": int|None,   # None cuando la variable no tiene limite
            "pct_fuera": float|None,
          },
          ...
        ]
      }
    """
    umb = _umbrales_equipo(db, equipo_id)

    total = (
        db.query(func.count())
        .select_from(Medicion)
        .filter(Medicion.equipo_id == equipo_id)
        .scalar()
        or 0
    )

    variables = []
    for nombre, nombre_col, unidad, tipo in VARIABLES:
        columna = getattr(Medicion, nombre_col)

        promedio, minimo, maximo = (
            db.query(func.avg(columna), func.min(columna), func.max(columna))
            .filter(Medicion.equipo_id == equipo_id)
            .one()
        )

        condicion = _condicion_fuera(tipo, columna, umb)
        fuera: Optional[int] = None
        pct: Optional[float] = None
        if condicion is not None:
            fuera = (
                db.query(func.count())
                .select_from(Medicion)
                .filter(
                    Medicion.equipo_id == equipo_id,
                    columna.isnot(None),
                    condicion,
                )
                .scalar()
                or 0
            )
            if total > 0:
                pct = round(fuera * 100.0 / total, 1)

        variables.append(
            {
                "variable": nombre,
                "unidad": unidad,
                "promedio": float(promedio) if promedio is not None else None,
                "minimo": float(minimo) if minimo is not None else None,
                "maximo": float(maximo) if maximo is not None else None,
                "limite": _texto_limite(tipo, umb),
                "fuera_rango": fuera,
                "pct_fuera": pct,
            }
        )

    return {"total_mediciones": total, "variables": variables}
