import sys
import random
import inspect
from pathlib import Path
from datetime import datetime, timedelta, timezone

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_ROOT = SCRIPT_DIR.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker
from app.models.medicion import Medicion
import entrenar_modelo  # Carga en memoria la configuracion de BD que ya usa entrenar_modelo.py


def obtener_sesion_bd() -> Session:
    """
    Detecta automaticamente el Engine, sessionmaker o generador get_db
    cargado en los modulos del proyecto y retorna una sesion activa.
    """
    # Asegurar que el modulo donde se define Base este cargado
    for cls in Medicion.__mro__[1:]:
        mod_name = getattr(cls, "__module__", "")
        if mod_name.startswith("app."):
            __import__(mod_name)

    modulos_proyecto = [
        mod for nombre, mod in list(sys.modules.items())
        if mod is not None and (nombre.startswith("app") or nombre == "entrenar_modelo")
    ]

    # 1. Buscar instancia de Engine de SQLAlchemy (metodo mas directo en SQLAlchemy 2.x)
    for mod in modulos_proyecto:
        for _, obj in inspect.getmembers(mod):
            if isinstance(obj, Engine):
                print(f"Engine detectado en modulo: {mod.__name__}")
                return Session(bind=obj)

    # 2. Buscar sessionmaker (SessionLocal)
    for mod in modulos_proyecto:
        for _, obj in inspect.getmembers(mod):
            if isinstance(obj, sessionmaker):
                print(f"Sessionmaker detectado en modulo: {mod.__name__}")
                return obj()

    # 3. Buscar generador get_db()
    for mod in modulos_proyecto:
        if hasattr(mod, "get_db") and callable(mod.get_db):
            gen = mod.get_db()
            if inspect.isgenerator(gen):
                print(f"Generador get_db detectado en modulo: {mod.__name__}")
                return next(gen)

    raise RuntimeError("No se encontro ningun Engine, SessionLocal ni get_db en los modulos cargados.")


def generar_medicion_por_escenario(escenario: str) -> dict:
    v1 = random.gauss(220.0, 2.0)
    v2 = random.gauss(220.0, 2.0)
    v3 = random.gauss(220.0, 2.0)
    i1 = random.gauss(45.0, 3.0)
    i2 = random.gauss(45.0, 3.0)
    i3 = random.gauss(45.0, 3.0)
    thd = max(0.5, random.gauss(2.5, 0.5))
    frecuencia = random.gauss(50.0, 0.08)
    fp = min(0.99, max(0.80, random.gauss(0.95, 0.015)))
    temp = random.gauss(34.0, 2.0)

    if escenario == "thd_alto":
        thd = random.gauss(8.5, 1.5)
        temp = random.gauss(42.0, 2.5)
    elif escenario == "fp_bajo":
        fp = min(0.88, max(0.65, random.gauss(0.78, 0.04)))
        i1 = random.gauss(62.0, 4.0)
        i2 = random.gauss(62.0, 4.0)
        i3 = random.gauss(62.0, 4.0)
    elif escenario == "sobrecarga":
        i1 = random.gauss(112.0, 6.0)
        i2 = random.gauss(114.0, 6.0)
        i3 = random.gauss(110.0, 6.0)
        temp = random.gauss(54.0, 3.5)
        v1 = random.gauss(213.0, 2.5)
        v2 = random.gauss(213.0, 2.5)
        v3 = random.gauss(213.0, 2.5)
    elif escenario == "sobrevoltaje":
        v1 = random.gauss(248.0, 4.0)
        v2 = random.gauss(247.0, 4.0)
        v3 = random.gauss(249.0, 4.0)
        temp = random.gauss(45.0, 2.5)
    elif escenario == "bajo_voltaje":
        v1 = random.gauss(198.0, 4.0)
        v2 = random.gauss(197.0, 4.0)
        v3 = random.gauss(199.0, 4.0)
        i1 = random.gauss(68.0, 4.0)
        i2 = random.gauss(68.0, 4.0)
        i3 = random.gauss(68.0, 4.0)
    elif escenario == "desbalance":
        v1 = random.gauss(228.0, 2.5)
        v2 = random.gauss(210.0, 2.5)
        v3 = random.gauss(219.0, 2.5)
        i1 = random.gauss(75.0, 4.0)
        i2 = random.gauss(38.0, 4.0)
        i3 = random.gauss(52.0, 4.0)
        temp = random.gauss(49.0, 3.0)
    elif escenario == "falla_critica":
        v1 = random.gauss(188.0, 6.0)
        v2 = random.gauss(246.0, 6.0)
        v3 = random.gauss(202.0, 6.0)
        i1 = random.gauss(128.0, 8.0)
        i2 = random.gauss(135.0, 8.0)
        i3 = random.gauss(95.0, 8.0)
        thd = random.gauss(11.5, 2.0)
        frecuencia = random.gauss(48.9, 0.3)
        fp = min(0.85, max(0.55, random.gauss(0.70, 0.05)))
        temp = random.gauss(66.0, 4.0)

    return {
        "voltaje_l1": round(v1, 2),
        "voltaje_l2": round(v2, 2),
        "voltaje_l3": round(v3, 2),
        "corriente_l1": round(i1, 2),
        "corriente_l2": round(i2, 2),
        "corriente_l3": round(i3, 2),
        "thd": round(thd, 2),
        "frecuencia": round(frecuencia, 2),
        "factor_potencia": round(fp, 3),
        "temperatura_gabinete": round(temp, 2),
        "estado_medicion": escenario,
    }


def main():
    db = obtener_sesion_bd()
    try:
        bind = db.get_bind()
        url_segura = bind.url.render_as_string(hide_password=True)
        print(f"Conectado a base de datos: {url_segura}")

        filas_equipos = db.execute(text("SELECT id FROM equipos ORDER BY id ASC")).fetchall()
        if not filas_equipos:
            print(
                "[ERROR] La tabla 'equipos' no tiene registros en esta base de datos. "
                "Crea al menos un equipo desde tu aplicacion o verifica tu archivo .env."
            )
            sys.exit(1)

        equipos_ids = [fila[0] for fila in filas_equipos]
        print(f"Equipos encontrados (IDs): {equipos_ids}")

        plan_escenarios = (
            ["normal"] * 600
            + ["thd_alto"] * 120
            + ["fp_bajo"] * 120
            + ["sobrecarga"] * 120
            + ["sobrevoltaje"] * 60
            + ["bajo_voltaje"] * 60
            + ["desbalance"] * 60
            + ["falla_critica"] * 60
        )
        random.shuffle(plan_escenarios)

        ahora = datetime.now(timezone.utc)
        total = len(plan_escenarios)
        nuevas_mediciones = []

        for idx, escenario in enumerate(plan_escenarios):
            ts = ahora - timedelta(seconds=(total - idx) * 5)
            equipo_id = random.choice(equipos_ids)
            datos = generar_medicion_por_escenario(escenario)

            nuevas_mediciones.append(
                Medicion(
                    equipo_id=equipo_id,
                    timestamp=ts,
                    **datos,
                )
            )

        db.add_all(nuevas_mediciones)
        db.commit()
        print(f"Se insertaron exitosamente {total} mediciones de entrenamiento.")

    except Exception as exc:
        db.rollback()
        print(f"[ERROR] Fallo al insertar mediciones: {exc}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()