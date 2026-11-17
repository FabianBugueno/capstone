import sys
import argparse
from pathlib import Path

# Agregar el directorio raiz del backend al sys.path para resolver imports de 'app'
BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

from app.core.database import Sessionlocal
from app.services.detector_ml import entrenar_modelos_con_historial


def main():
    parser = argparse.ArgumentParser(
        description="Script de entrenamiento de modelos ML para PowerGuardian Pro"
    )
    parser.add_argument(
        "--limite",
        type=int,
        default=5000,
        help="Maximo de mediciones historicas a consultar de TimescaleDB (default: 5000)",
    )
    parser.add_argument(
        "--contaminacion",
        type=float,
        default=0.05,
        help="Proporcion esperada de outliers para Isolation Forest (default: 0.05)",
    )
    parser.add_argument(
        "--arboles",
        type=int,
        default=150,
        help="Numero de arboles (n_estimators) para ambos modelos (default: 150)",
    )
    args = parser.parse_args()

    print("=== Iniciando entrenamiento de modelos PowerGuardian Pro ===")
    print(f"Parametros: limite={args.limite}, contaminacion={args.contaminacion}, arboles={args.arboles}")

    db = Sessionlocal()
    try:
        metadata = entrenar_modelos_con_historial(
            db=db,
            limite_registros=args.limite,
            contamination=args.contaminacion,
            n_estimators=args.arboles,
        )

        rf_metrics = metadata["metricas_clasificador"]
        if_metrics = metadata["parametros_iforest"]

        print("\n--- Entrenamiento finalizado con exito ---")
        print(f"Version del modelo      : {metadata['modelo_version']}")
        print(f"Fecha de entrenamiento  : {metadata['fecha_entrenamiento']}")
        print(f"Muestras totales usadas : {metadata['total_muestras']}")
        print(f"Muestras normales (IF)  : {if_metrics['muestras_entrenamiento']}")
        print("\n--- Metricas Random Forest Classifier ---")
        print(f"Accuracy (Exactitud)    : {rf_metrics['accuracy'] * 100:.2f}%")
        print(f"F1-Score (Macro)        : {rf_metrics['f1_macro']:.4f}")
        print(f"F1-Score (Weighted)     : {rf_metrics['f1_weighted']:.4f}")
        print("\nDistribucion de clases de entrenamiento:")
        for clase, cantidad in rf_metrics["distribucion_clases"].items():
            print(f"  - {clase:<16}: {cantidad} registros")

        print("\nTop 5 Features con mayor importancia predictiva:")
        importancias_ordenadas = sorted(
            rf_metrics["importancia_features"].items(),
            key=lambda item: item[1],
            reverse=True,
        )[:5]
        for nombre_feat, valor_imp in importancias_ordenadas:
            print(f"  - {nombre_feat:<26}: {valor_imp:.4f}")

    except Exception as exc:
        print(f"\n[ERROR] No se pudo completar el entrenamiento: {exc}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()