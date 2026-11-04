import random
import math


def normal(t: float) -> dict:
    """Operacion normal - parametros dentro de rango"""
    return {
        "voltaje_l1": round(220 + random.gauss(0, 2.5) + 3 * math.sin(t / 50), 1),
        "voltaje_l2": round(220 + random.gauss(0, 2.5) + 3 * math.sin(t / 50 + 2.09), 1),
        "voltaje_l3": round(220 + random.gauss(0, 2.5) + 3 * math.sin(t / 50 + 4.19), 1),
        "corriente_l1": round(random.gauss(55, 8), 1),
        "corriente_l2": round(random.gauss(55, 8), 1),
        "corriente_l3": round(random.gauss(55, 8), 1),
        "thd": round(max(0.5, random.gauss(3.2, 0.8)), 1),
        "frecuencia": round(random.gauss(50.0, 0.05), 2),
        "factor_potencia": round(min(0.99, random.gauss(0.95, 0.015)), 2),
        "temperatura_gabinete": round(random.gauss(35, 3), 1),
        "estado_medicion": "normal",
    }


def thd_alto(t: float) -> dict:
    """THD elevado - VFDs sin filtro o cargas no lineales"""
    base = normal(t)
    base["thd"] = round(max(5.5, random.gauss(9.5, 2.0)), 1)
    base["voltaje_l1"] = round(base["voltaje_l1"] + random.gauss(0, 4), 1)
    base["voltaje_l2"] = round(base["voltaje_l2"] + random.gauss(0, 4), 1)
    base["voltaje_l3"] = round(base["voltaje_l3"] + random.gauss(0, 4), 1)
    base["temperatura_gabinete"] = round(random.gauss(42, 4), 1)
    base["estado_medicion"] = "advertencia"
    return base


def fp_bajo(t: float) -> dict:
    """Factor de potencia bajo - carga inductiva excesiva"""
    base = normal(t)
    base["factor_potencia"] = round(max(0.6, min(0.88, random.gauss(0.78, 0.04))), 2)
    base["corriente_l1"] = round(random.gauss(75, 10), 1)
    base["corriente_l2"] = round(random.gauss(75, 10), 1)
    base["corriente_l3"] = round(random.gauss(75, 10), 1)
    base["estado_medicion"] = "advertencia"
    return base


def sobrecarga(t: float) -> dict:
    """Sobrecarga - corrientes exceden capacidad nominal"""
    base = normal(t)
    base["corriente_l1"] = round(random.gauss(115, 12), 1)
    base["corriente_l2"] = round(random.gauss(110, 10), 1)
    base["corriente_l3"] = round(random.gauss(118, 15), 1)
    base["voltaje_l1"] = round(base["voltaje_l1"] - random.gauss(8, 3), 1)
    base["voltaje_l2"] = round(base["voltaje_l2"] - random.gauss(8, 3), 1)
    base["voltaje_l3"] = round(base["voltaje_l3"] - random.gauss(8, 3), 1)
    base["temperatura_gabinete"] = round(random.gauss(55, 5), 1)
    base["factor_potencia"] = round(min(0.92, random.gauss(0.85, 0.03)), 2)
    base["estado_medicion"] = "alerta"
    return base


def sobrevoltaje(t: float) -> dict:
    """Sobrevoltaje - tension por encima del rango seguro"""
    base = normal(t)
    offset = random.gauss(30, 5)
    base["voltaje_l1"] = round(220 + offset + random.gauss(0, 2), 1)
    base["voltaje_l2"] = round(220 + offset + random.gauss(0, 2), 1)
    base["voltaje_l3"] = round(220 + offset + random.gauss(0, 2), 1)
    base["temperatura_gabinete"] = round(random.gauss(45, 4), 1)
    base["estado_medicion"] = "alerta"
    return base


def bajo_voltaje(t: float) -> dict:
    """Bajo voltaje - tension cae por debajo del minimo"""
    base = normal(t)
    drop = random.gauss(20, 5)
    base["voltaje_l1"] = round(220 - drop + random.gauss(0, 2), 1)
    base["voltaje_l2"] = round(220 - drop + random.gauss(0, 2), 1)
    base["voltaje_l3"] = round(220 - drop - random.gauss(5, 2), 1)
    base["estado_medicion"] = "alerta"
    return base


def desbalance(t: float) -> dict:
    """Desbalance de fases - una fase difiere significativamente"""
    base = normal(t)
    base["voltaje_l3"] = round(base["voltaje_l3"] - random.gauss(18, 4), 1)
    base["corriente_l3"] = round(base["corriente_l3"] + random.gauss(25, 5), 1)
    base["factor_potencia"] = round(min(0.92, random.gauss(0.87, 0.03)), 2)
    base["estado_medicion"] = "advertencia"
    return base


def falla_critica(t: float) -> dict:
    """Falla critica - multiples parametros fuera de rango"""
    return {
        "voltaje_l1": round(random.gauss(255, 8), 1),
        "voltaje_l2": round(random.gauss(195, 10), 1),
        "voltaje_l3": round(random.gauss(180, 12), 1),
        "corriente_l1": round(random.gauss(135, 15), 1),
        "corriente_l2": round(random.gauss(120, 12), 1),
        "corriente_l3": round(random.gauss(140, 18), 1),
        "thd": round(max(8, random.gauss(14.0, 3.0)), 1),
        "frecuencia": round(random.gauss(49.6, 0.3), 2),
        "factor_potencia": round(max(0.55, random.gauss(0.68, 0.06)), 2),
        "temperatura_gabinete": round(random.gauss(62, 6), 1),
        "estado_medicion": "critico",
    }


ESCENARIOS = {
    "normal": normal,
    "thd_alto": thd_alto,
    "fp_bajo": fp_bajo,
    "sobrecarga": sobrecarga,
    "sobrevoltaje": sobrevoltaje,
    "bajo_voltaje": bajo_voltaje,
    "desbalance": desbalance,
    "falla_critica": falla_critica,
}


def generar_mixto(t: float) -> tuple:
    """Genera medicion con probabilidad ponderada"""
    r = random.random()
    if r < 0.55:
        return "normal", normal(t)
    elif r < 0.70:
        return "thd_alto", thd_alto(t)
    elif r < 0.80:
        return "fp_bajo", fp_bajo(t)
    elif r < 0.88:
        return "sobrecarga", sobrecarga(t)
    elif r < 0.93:
        return "sobrevoltaje", sobrevoltaje(t)
    elif r < 0.96:
        return "bajo_voltaje", bajo_voltaje(t)
    elif r < 0.99:
        return "desbalance", desbalance(t)
    else:
        return "falla_critica", falla_critica(t)
