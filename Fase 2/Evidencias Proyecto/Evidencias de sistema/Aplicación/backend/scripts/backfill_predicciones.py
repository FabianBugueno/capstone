"""
Backfill del historial de predicciones ML.

Genera predicciones a partir de las N mediciones mas recientes de un equipo
para poblar el historial (grafico de evolucion, tabla y reportes).

Uso:
    python scripts/backfill_predicciones.py [--equipo 2] [--cantidad 30]
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import desc

from app.core.database import Sessionlocal
from app.models.medicion import Medicion
from app.models.prediccion_ml import PrediccionML
from app.services.detector_ml import cargar_modelos_desde_disco, ejecutar_prediccion_completa


def main() -> int:
    parser = argparse.ArgumentParser(description="Backfill de predicciones ML")
    parser.add_argument("--equipo", type=int, default=2, help="ID del equipo")
    parser.add_argument("--cantidad", type=int, default=30, help="Cantidad de mediciones recientes a evaluar")
    parser.add_argument("--limpiar", action="store_true", help="Elimina antes las predicciones existentes del equipo")
    args = parser.parse_args()

    if not cargar_modelos_desde_disco():
        print("ERROR: los modelos ML no estan entrenados. Ejecuta antes POST /ml/entrenar.")
        return 1

    db = Sessionlocal()
    try:
        if args.limpiar:
            eliminadas = (
                db.query(PrediccionML)
                .filter(PrediccionML.equipo_id == args.equipo)
                .delete(synchronize_session=False)
            )
            db.commit()
            print(f"Predicciones eliminadas: {eliminadas}")

        mediciones = (
            db.query(Medicion)
            .filter(Medicion.equipo_id == args.equipo)
            .order_by(desc(Medicion.timestamp))
            .limit(args.cantidad)
            .all()
        )
        if not mediciones:
            print(f"El equipo {args.equipo} no tiene mediciones.")
            return 1

        # De mas antigua a mas reciente para que el historial quede coherente
        mediciones.reverse()

        creadas = 0
        for med in mediciones:
            resultado = ejecutar_prediccion_completa(
                db=db,
                equipo_id=args.equipo,
                medicion=med,
                ventana_n=30,
                guardar_en_bd=True,
            )
            if resultado:
                creadas += 1

        total = (
            db.query(PrediccionML).filter(PrediccionML.equipo_id == args.equipo).count()
        )
        print(f"Predicciones creadas: {creadas} | total en historial: {total}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
