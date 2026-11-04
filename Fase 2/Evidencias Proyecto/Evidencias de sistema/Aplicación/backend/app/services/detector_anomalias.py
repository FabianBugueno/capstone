from datetime import timedelta
from sqlalchemy.orm import Session
from app.models.incidencia import Incidencia
from app.models.parametros_config import ParametrosConfig

VENTANA_REPETICION = timedelta(seconds=60)


def detectar_anomalias(db: Session, equipo_id: int, medicion) -> list[Incidencia]:
    params = db.query(ParametrosConfig).filter(
        ParametrosConfig.equipo_id == equipo_id
    ).first()

    if not params:
        return []

    incidencias = []

    if params.voltaje_max:
        for fase, campo in [("L1", "voltaje_l1"), ("L2", "voltaje_l2"), ("L3", "voltaje_l3")]:
            valor = getattr(medicion, campo, None)
            if valor and float(valor) > float(params.voltaje_max):
                incidencias.append(Incidencia(
                    equipo_id=equipo_id,
                    timestamp=medicion.timestamp,
                    tipo="Sobrevoltaje",
                    nivel="critico",
                    descripcion=f"Voltaje {fase} ({valor} V) supera el máximo ({params.voltaje_max} V)",
                    valor_medido=valor,
                    umbral_config=params.voltaje_max,
                ))

    if params.voltaje_min:
        for fase, campo in [("L1", "voltaje_l1"), ("L2", "voltaje_l2"), ("L3", "voltaje_l3")]:
            valor = getattr(medicion, campo, None)
            if valor and float(valor) < float(params.voltaje_min):
                incidencias.append(Incidencia(
                    equipo_id=equipo_id,
                    timestamp=medicion.timestamp,
                    tipo="Bajo Voltaje",
                    nivel="critico",
                    descripcion=f"Voltaje {fase} ({valor} V) bajo el mínimo ({params.voltaje_min} V)",
                    valor_medido=valor,
                    umbral_config=params.voltaje_min,
                ))

    if params.thd_max and medicion.thd:
        if float(medicion.thd) > float(params.thd_max):
            nivel = "advertencia" if float(medicion.thd) < float(params.thd_max) * 1.5 else "critico"
            incidencias.append(Incidencia(
                equipo_id=equipo_id,
                timestamp=medicion.timestamp,
                tipo="THD Alto",
                nivel=nivel,
                descripcion=f"THD ({medicion.thd}%) supera el máximo ({params.thd_max}%)",
                valor_medido=medicion.thd,
                umbral_config=params.thd_max,
            ))

    if params.corriente_max:
        for fase, campo in [("L1", "corriente_l1"), ("L2", "corriente_l2"), ("L3", "corriente_l3")]:
            valor = getattr(medicion, campo, None)
            if valor and float(valor) > float(params.corriente_max):
                incidencias.append(Incidencia(
                    equipo_id=equipo_id,
                    timestamp=medicion.timestamp,
                    tipo="Sobrecorriente",
                    nivel="critico",
                    descripcion=f"Corriente {fase} ({valor} A) supera el máximo ({params.corriente_max} A)",
                    valor_medido=valor,
                    umbral_config=params.corriente_max,
                ))

    if params.factor_potencia_min and medicion.factor_potencia:
        if float(medicion.factor_potencia) < float(params.factor_potencia_min):
            incidencias.append(Incidencia(
                equipo_id=equipo_id,
                timestamp=medicion.timestamp,
                tipo="Bajo Factor Potencia",
                nivel="advertencia",
                descripcion=f"FP ({medicion.factor_potencia}) bajo el mínimo ({params.factor_potencia_min})",
                valor_medido=medicion.factor_potencia,
                umbral_config=params.factor_potencia_min,
            ))

    # Con mediciones cada segundo, la misma alarma se repetiria sin parar:
    # se omite si ya hay una activa del mismo tipo para el equipo en la ventana reciente.
    vistos = set()
    nuevas = []
    for inc in incidencias:
        if inc.tipo in vistos:
            continue
        vistos.add(inc.tipo)
        repetida = db.query(Incidencia.id).filter(
            Incidencia.equipo_id == equipo_id,
            Incidencia.tipo == inc.tipo,
            Incidencia.estado == "activa",
            Incidencia.timestamp >= medicion.timestamp - VENTANA_REPETICION,
        ).first()
        if not repetida:
            nuevas.append(inc)
    incidencias = nuevas

    for inc in incidencias:
        db.add(inc)
    if incidencias:
        db.commit()

    return incidencias
