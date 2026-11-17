import os
import json
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

import numpy as np
import joblib
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, classification_report
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.medicion import Medicion
from app.models.prediccion_ml import PrediccionML

# Configuracion de rutas y constantes del modelo
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ML_MODELS_DIR = BASE_DIR / "ml_models"
ML_MODELS_DIR.mkdir(parents=True, exist_ok=True)

IFOREST_PATH = ML_MODELS_DIR / "isolation_forest.joblib"
RF_CLASSIFIER_PATH = ML_MODELS_DIR / "random_forest_classifier.joblib"
SCALER_IFOREST_PATH = ML_MODELS_DIR / "scaler_iforest.joblib"
SCALER_RF_PATH = ML_MODELS_DIR / "scaler_rf.joblib"
METADATA_PATH = ML_MODELS_DIR / "metadata_modelo.json"

MODELO_VERSION = "v1.1.0"
FRECUENCIA_NOMINAL_DEFAULT = 50.0

# Base de conocimiento de diagnosticos electricos por clase de falla.
# Cada clase incluye: descripcion tecnica, posibles consecuencias fisicas,
# componentes en riesgo, y recomendacion de accion inmediata.
DIAGNOSTICOS_ELECTRICOS = {
    "normal": {
        "titulo": "Operacion Normal",
        "descripcion": "Todos los parametros electricos se encuentran dentro de los rangos establecidos por norma.",
        "consecuencias": [],
        "componentes_en_riesgo": [],
        "accion_recomendada": "Mantener monitoreo continuo. Sin accion requerida.",
        "norma_referencia": "IEEE 519 / IEC 61000-4-30",
    },
    "thd_alto": {
        "titulo": "Distorsion Armonica Elevada (THD Alto)",
        "descripcion": "La distorsion armonica total supera el umbral permitido, lo que indica presencia excesiva de armonicos en la red electrica.",
        "consecuencias": [
            "Sobrecalentamiento de transformadores y motores por perdidas adicionales en el hierro y cobre",
            "Disparo falso de interruptores termomagneticos y relays de proteccion",
            "Degradacion prematura del aislamiento de cables y bobinados",
            "Errores de medicion en instrumentos analogicos y digitales",
            "Resonancia armonica que puede amplificar corrientes y daniar capacitores",
        ],
        "componentes_en_riesgo": [
            "Transformadores de distribucion",
            "Bancos de capacitores (riesgo de explosion por resonancia)",
            "Motores electricos (vibracion y calentamiento anormal)",
            "Variadores de frecuencia (VFD)",
            "Equipos electronicos sensibles (PLC, servidores)",
        ],
        "accion_recomendada": "Instalar filtros de armonicos pasivos o activos. Verificar cargas no lineales conectadas (rectificadores, UPS, VFD). Realizar estudio de calidad de energia segun IEEE 519.",
        "norma_referencia": "IEEE 519-2022 (limites de distorsion armonica)",
    },
    "fp_bajo": {
        "titulo": "Factor de Potencia Bajo",
        "descripcion": "El factor de potencia esta por debajo del minimo aceptable, indicando consumo excesivo de potencia reactiva.",
        "consecuencias": [
            "Multas por parte de la compania electrica por bajo factor de potencia (bajo 0.93 en Chile)",
            "Sobrecarga de cables y transformadores al transportar corriente reactiva improductiva",
            "Caida de tension en la red interna que afecta arranque de motores",
            "Aumento de perdidas por efecto Joule (I2R) en conductores",
            "Reduccion de la capacidad util del sistema electrico",
        ],
        "componentes_en_riesgo": [
            "Conductores electricos (sobrecalentamiento por exceso de corriente)",
            "Transformadores de potencia (reduccion de vida util)",
            "Interruptores automaticos (posible sobrecarga termica)",
            "Tableros de distribucion",
        ],
        "accion_recomendada": "Instalar banco de capacitores para correccion de factor de potencia. Verificar motores sobredimensionados operando en vacio. Evaluar controlador automatico de reactivos.",
        "norma_referencia": "SEC Chile (DS 327) / IEEE 1459",
    },
    "sobrecarga": {
        "titulo": "Sobrecarga Electrica",
        "descripcion": "La corriente consumida supera la capacidad nominal del equipo, provocando estres termico en conductores y protecciones.",
        "consecuencias": [
            "Sobrecalentamiento critico de cables que puede provocar incendios",
            "Fusion de fusibles o disparo de interruptores automaticos",
            "Degradacion acelerada del aislamiento por temperatura excesiva",
            "Deformacion mecanica de barras de cobre en tableros",
            "Falla en conexiones (puntos calientes por resistencia de contacto)",
        ],
        "componentes_en_riesgo": [
            "Cables de alimentacion (riesgo de incendio si superan 90 C)",
            "Interruptores termomagneticos (desgaste de contactos)",
            "Contactores y reles (soldadura de contactos)",
            "Bornes y conexiones atornilladas (puntos calientes)",
            "Transformadores (acortamiento de vida util por regla de Montsinger)",
        ],
        "accion_recomendada": "Reducir carga inmediatamente. Verificar con termografia infrarroja los puntos de conexion. Redistribuir cargas entre fases. Evaluar ampliacion de capacidad del tablero.",
        "norma_referencia": "NEC/NFPA 70 / IEC 60364",
    },
    "falla_critica": {
        "titulo": "Falla Critica Inminente",
        "descripcion": "Multiples parametros electricos estan fuera de rango simultaneamente, indicando una condicion de operacion peligrosa que puede derivar en falla catastrofica.",
        "consecuencias": [
            "Cortocircuito con arco electrico (riesgo de explosion y quemaduras)",
            "Incendio en tablero electrico por sobrecalentamiento sostenido",
            "Dano permanente a motores, transformadores y equipos de control",
            "Interrupcion total del suministro electrico (blackout)",
            "Riesgo de electrocucion para personal de mantenimiento",
            "Dano a equipos electronicos sensibles conectados aguas abajo",
        ],
        "componentes_en_riesgo": [
            "TODO el tablero electrico (riesgo de incendio)",
            "Transformadores (falla de aislamiento, explosion)",
            "Motores (quemado de bobinados)",
            "Cables de potencia (carbonizacion del aislamiento)",
            "Equipos de proteccion (superacion de capacidad de corte)",
            "Personal cercano (riesgo de arco electrico - NFPA 70E)",
        ],
        "accion_recomendada": "DESCONECTAR EL EQUIPO DE INMEDIATO. Notificar al personal de mantenimiento electrico. No reconectar hasta realizar inspeccion visual y mediciones con megohmetro. Verificar termografia antes de reenergizar.",
        "norma_referencia": "NFPA 70E (seguridad electrica) / IEC 60909 (corrientes de cortocircuito)",
    },
}


def generar_diagnostico_detallado(
    clase_predicha: str,
    probabilidad: float,
    riesgo_falla: float,
    horizonte_min: int,
    medicion: Any,
) -> Dict[str, Any]:
    """
    Genera un diagnostico tecnico detallado basado en la clase predicha por el modelo ML
    y los valores electricos actuales de la medicion. Incluye consecuencias fisicas,
    componentes en riesgo y acciones recomendadas.
    """
    diag_base = DIAGNOSTICOS_ELECTRICOS.get(clase_predicha, DIAGNOSTICOS_ELECTRICOS["falla_critica"])

    # Construir indicadores especificos basados en los valores reales de la medicion
    indicadores_anomalos = []

    thd = float(getattr(medicion, "thd", 0) or 0)
    fp = float(getattr(medicion, "factor_potencia", 1) or 1)
    v1 = float(getattr(medicion, "voltaje_l1", 220) or 220)
    v2 = float(getattr(medicion, "voltaje_l2", 220) or 220)
    v3 = float(getattr(medicion, "voltaje_l3", 220) or 220)
    i1 = float(getattr(medicion, "corriente_l1", 0) or 0)
    i2 = float(getattr(medicion, "corriente_l2", 0) or 0)
    i3 = float(getattr(medicion, "corriente_l3", 0) or 0)
    freq = float(getattr(medicion, "frecuencia", 50) or 50)
    temp = float(getattr(medicion, "temperatura_gabinete", 25) or 25)

    if thd > 5.0:
        indicadores_anomalos.append(f"THD en {thd:.1f}% (limite recomendado: 5%)")
    if fp < 0.90:
        indicadores_anomalos.append(f"Factor de potencia en {fp:.3f} (minimo aceptable: 0.90)")
    if max(v1, v2, v3) > 240:
        indicadores_anomalos.append(f"Voltaje maximo detectado: {max(v1, v2, v3):.1f} V (limite: 240 V)")
    if min(v1, v2, v3) < 210:
        indicadores_anomalos.append(f"Voltaje minimo detectado: {min(v1, v2, v3):.1f} V (minimo: 210 V)")
    if max(i1, i2, i3) > 100:
        indicadores_anomalos.append(f"Corriente maxima detectada: {max(i1, i2, i3):.1f} A (limite: 100 A)")
    if abs(freq - 50.0) > 0.5:
        indicadores_anomalos.append(f"Frecuencia en {freq:.2f} Hz (nominal: 50.00 Hz)")
    if temp > 45:
        indicadores_anomalos.append(f"Temperatura gabinete en {temp:.1f} C (alerta sobre 45 C)")

    # Desbalance de voltaje
    v_prom = (v1 + v2 + v3) / 3.0
    if v_prom > 0:
        desbalance_v = (max(abs(v1 - v_prom), abs(v2 - v_prom), abs(v3 - v_prom)) / v_prom) * 100
        if desbalance_v > 2.0:
            indicadores_anomalos.append(f"Desbalance de voltaje: {desbalance_v:.1f}% (limite NEMA: 2%)")

    return {
        "titulo": diag_base["titulo"],
        "descripcion": diag_base["descripcion"],
        "consecuencias_posibles": diag_base["consecuencias"],
        "componentes_en_riesgo": diag_base["componentes_en_riesgo"],
        "accion_recomendada": diag_base["accion_recomendada"],
        "norma_referencia": diag_base["norma_referencia"],
        "indicadores_anomalos_actuales": indicadores_anomalos,
        "severidad_general": (
            "critica" if riesgo_falla >= 0.75
            else "alta" if riesgo_falla >= 0.50
            else "moderada" if riesgo_falla >= 0.20
            else "baja"
        ),
    }

# Nombres ordenados de las 14 features (10 originales + 4 derivadas)
FEATURE_NAMES = [
    "voltaje_l1",
    "voltaje_l2",
    "voltaje_l3",
    "corriente_l1",
    "corriente_l2",
    "corriente_l3",
    "thd",
    "frecuencia",
    "factor_potencia",
    "temperatura_gabinete",
    "desbalance_voltaje_pct",
    "desbalance_corriente_pct",
    "desviacion_frecuencia",
    "corriente_promedio",
]

# Mapeo de los 8 escenarios del simulador hacia las 5 clases canonicas requeridas
MAPEO_ESTADOS_SIMULADOR = {
    "normal": "normal",
    "thd_alto": "thd_alto",
    "fp_bajo": "fp_bajo",
    "sobrecarga": "sobrecarga",
    "sobrevoltaje": "falla_critica",
    "bajo_voltaje": "falla_critica",
    "desbalance": "falla_critica",
    "falla_critica": "falla_critica",
    "falla": "falla_critica",
}


def calcular_features_derivadas(
    v1: float,
    v2: float,
    v3: float,
    i1: float,
    i2: float,
    i3: float,
    frecuencia: float,
    frecuencia_nominal: float = FRECUENCIA_NOMINAL_DEFAULT,
) -> Dict[str, float]:
    """
    Calcula indicadores fisicos derivados basados en normas electricas (NEMA MG1 / IEEE):
    1. Desbalance de voltaje (%): Maxima desviacion respecto al promedio dividida por el promedio.
    2. Desbalance de corriente (%): Maxima desviacion de corriente respecto al promedio.
    3. Desviacion de frecuencia (Hz): Valor absoluto de la diferencia respecto a la frecuencia nominal.
    4. Corriente promedio (A): Magnitud media de carga entre las tres fases.
    """
    voltajes = [v1, v2, v3]
    v_prom = sum(voltajes) / 3.0
    if v_prom > 0:
        max_desv_v = max(abs(v - v_prom) for v in voltajes)
        desbalance_voltaje_pct = (max_desv_v / v_prom) * 100.0
    else:
        desbalance_voltaje_pct = 0.0

    corrientes = [i1, i2, i3]
    i_prom = sum(corrientes) / 3.0
    if i_prom > 0:
        max_desv_i = max(abs(i - i_prom) for i in corrientes)
        desbalance_corriente_pct = (max_desv_i / i_prom) * 100.0
    else:
        desbalance_corriente_pct = 0.0

    desviacion_frecuencia = abs(frecuencia - frecuencia_nominal)

    return {
        "desbalance_voltaje_pct": round(desbalance_voltaje_pct, 4),
        "desbalance_corriente_pct": round(desbalance_corriente_pct, 4),
        "desviacion_frecuencia": round(desviacion_frecuencia, 4),
        "corriente_promedio": round(i_prom, 4),
    }


def extraer_features_medicion(
    medicion: Any,
    frecuencia_nominal: float = FRECUENCIA_NOMINAL_DEFAULT
) -> np.ndarray:
    """
    Convierte una instancia de Medicion (SQLAlchemy o diccionario/objeto equivalente)
    en un vector NumPy de 14 caracteristicas numericas en el orden exacto de FEATURE_NAMES.
    """
    v1 = float(getattr(medicion, "voltaje_l1", 220.0) or 220.0)
    v2 = float(getattr(medicion, "voltaje_l2", 220.0) or 220.0)
    v3 = float(getattr(medicion, "voltaje_l3", 220.0) or 220.0)
    i1 = float(getattr(medicion, "corriente_l1", 0.0) or 0.0)
    i2 = float(getattr(medicion, "corriente_l2", 0.0) or 0.0)
    i3 = float(getattr(medicion, "corriente_l3", 0.0) or 0.0)
    thd = float(getattr(medicion, "thd", 0.0) or 0.0)
    frecuencia = float(getattr(medicion, "frecuencia", frecuencia_nominal) or frecuencia_nominal)
    fp = float(getattr(medicion, "factor_potencia", 0.95) or 0.95)
    temp = float(getattr(medicion, "temperatura_gabinete", 25.0) or 25.0)

    derivadas = calcular_features_derivadas(
        v1=v1, v2=v2, v3=v3,
        i1=i1, i2=i2, i3=i3,
        frecuencia=frecuencia,
        frecuencia_nominal=frecuencia_nominal,
    )

    vector = np.array([
        v1,
        v2,
        v3,
        i1,
        i2,
        i3,
        thd,
        frecuencia,
        fp,
        temp,
        derivadas["desbalance_voltaje_pct"],
        derivadas["desbalance_corriente_pct"],
        derivadas["desviacion_frecuencia"],
        derivadas["corriente_promedio"],
    ], dtype=np.float64)

    return vector


def normalizar_etiqueta_estado(estado_raw: Optional[str]) -> str:
    """
    Homologa el campo estado_medicion proveniente del simulador hacia las clases
    objetivo del clasificador.
    """
    if not estado_raw:
        return "normal"
    limpio = estado_raw.strip().lower()
    return MAPEO_ESTADOS_SIMULADOR.get(limpio, "falla_critica")


def entrenar_isolation_forest(
    X_normales: np.ndarray,
    contamination: float = 0.05,
    n_estimators: int = 150,
    random_state: int = 42,
) -> Tuple[IsolationForest, StandardScaler, Dict[str, Any]]:
    """
    Entrena el modelo Isolation Forest utilizando exclusivamente mediciones historicas
    en estado normal para aprender la frontera de operacion saludable.
    """
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_normales)

    modelo_if = IsolationForest(
        n_estimators=n_estimators,
        contamination=contamination,
        max_samples="auto",
        random_state=random_state,
        n_jobs=-1,
    )
    modelo_if.fit(X_scaled)

    scores_train = modelo_if.decision_function(X_scaled)
    pred_train = modelo_if.predict(X_scaled)
    tasa_outliers_train = float(np.mean(pred_train == -1))

    resumen_if = {
        "muestras_entrenamiento": int(X_normales.shape[0]),
        "contamination": contamination,
        "n_estimators": n_estimators,
        "score_promedio_normal": round(float(np.mean(scores_train)), 4),
        "score_minimo_normal": round(float(np.min(scores_train)), 4),
        "tasa_outliers_entrenamiento": round(tasa_outliers_train, 4),
    }

    return modelo_if, scaler, resumen_if


def entrenar_random_forest(
    X: np.ndarray,
    y: np.ndarray,
    n_estimators: int = 150,
    random_state: int = 42,
) -> Tuple[RandomForestClassifier, StandardScaler, Dict[str, Any]]:
    """
    Entrena un clasificador Random Forest multiclase con ponderacion automatica de
    clases (class_weight='balanced') para compensar desbalances entre datos normales y fallas.
    """
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Verificar si todas las clases tienen al menos 2 muestras para estratificar
    clases_unicas, conteos = np.unique(y, return_counts=True)
    stratify_param = y if np.all(conteos >= 2) else None

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.20, random_state=random_state, stratify=stratify_param
    )

    clasificador = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=12,
        min_samples_split=4,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=random_state,
        n_jobs=-1,
    )
    clasificador.fit(X_train, y_train)

    y_pred = clasificador.predict(X_test)
    acc = float(accuracy_score(y_test, y_pred))
    f1_macro = float(f1_score(y_test, y_pred, average="macro", zero_division=0))
    f1_weighted = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))
    reporte_dict = classification_report(y_test, y_pred, output_dict=True, zero_division=0)

    importancias = {
        nombre: round(float(imp), 4)
        for nombre, imp in zip(FEATURE_NAMES, clasificador.feature_importances_)
    }

    metricas_rf = {
        "accuracy": round(acc, 4),
        "f1_macro": round(f1_macro, 4),
        "f1_weighted": round(f1_weighted, 4),
        "clases": [str(c) for c in clasificador.classes_],
        "distribucion_clases": {str(c): int(cnt) for c, cnt in zip(clases_unicas, conteos)},
        "importancia_features": importancias,
        "reporte_por_clase": reporte_dict,
    }

    return clasificador, scaler, metricas_rf


def guardar_modelos_en_disco(
    modelo_if: IsolationForest,
    scaler_if: StandardScaler,
    modelo_rf: RandomForestClassifier,
    scaler_rf: StandardScaler,
    metadata: Dict[str, Any],
) -> None:
    """
    Serializa y guarda en backend/ml_models/ los modelos entrenados, sus escaladores
    y el archivo JSON con metadatos y metricas de validacion.
    """
    ML_MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(modelo_if, IFOREST_PATH)
    joblib.dump(scaler_if, SCALER_IFOREST_PATH)
    joblib.dump(modelo_rf, RF_CLASSIFIER_PATH)
    joblib.dump(scaler_rf, SCALER_RF_PATH)

    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=4, ensure_ascii=False)


def cargar_modelos_desde_disco() -> Optional[Dict[str, Any]]:
    """
    Carga los modelos y escaladores desde disco. Si alguno no existe, retorna None.
    """
    archivos_requeridos = [
        IFOREST_PATH,
        SCALER_IFOREST_PATH,
        RF_CLASSIFIER_PATH,
        SCALER_RF_PATH,
        METADATA_PATH,
    ]
    if not all(p.exists() for p in archivos_requeridos):
        return None

    modelo_if = joblib.load(IFOREST_PATH)
    scaler_if = joblib.load(SCALER_IFOREST_PATH)
    modelo_rf = joblib.load(RF_CLASSIFIER_PATH)
    scaler_rf = joblib.load(SCALER_RF_PATH)

    with open(METADATA_PATH, "r", encoding="utf-8") as f:
        metadata = json.load(f)

    return {
        "isolation_forest": modelo_if,
        "scaler_if": scaler_if,
        "random_forest": modelo_rf,
        "scaler_rf": scaler_rf,
        "metadata": metadata,
    }


def obtener_estado_modelo() -> Dict[str, Any]:
    """
    Verifica si existen modelos entrenados y retorna sus metricas y metadatos.
    """
    artefactos = cargar_modelos_desde_disco()
    if not artefactos:
        return {
            "entrenado": False,
            "ruta_modelos": str(ML_MODELS_DIR),
        }

    meta = artefactos["metadata"]
    return {
        "entrenado": True,
        "modelo_version": meta.get("modelo_version", MODELO_VERSION),
        "fecha_entrenamiento": meta.get("fecha_entrenamiento"),
        "total_muestras_entrenamiento": meta.get("total_muestras"),
        "muestras_normales_iforest": meta.get("parametros_iforest", {}).get("muestras_entrenamiento"),
        "clases_reconocidas": meta.get("metricas_clasificador", {}).get("clases", []),
        "metricas_clasificador": {
            "accuracy": meta.get("metricas_clasificador", {}).get("accuracy"),
            "f1_macro": meta.get("metricas_clasificador", {}).get("f1_macro"),
            "f1_weighted": meta.get("metricas_clasificador", {}).get("f1_weighted"),
            "importancia_features": meta.get("metricas_clasificador", {}).get("importancia_features"),
        },
        "parametros_iforest": meta.get("parametros_iforest"),
        "ruta_modelos": str(ML_MODELS_DIR),
    }


def entrenar_modelos_con_historial(
    db: Session,
    limite_registros: int = 5000,
    contamination: float = 0.05,
    n_estimators: int = 150,
) -> Dict[str, Any]:
    """
    Consulta las mediciones historicas en TimescaleDB, construye la matriz de features,
    entrena Isolation Forest y Random Forest, y persiste los artefactos en disco.
    """
    mediciones = (
        db.query(Medicion)
        .order_by(desc(Medicion.timestamp))
        .limit(limite_registros)
        .all()
    )

    if len(mediciones) < 30:
        raise ValueError(
            f"Se requieren al menos 30 mediciones para entrenar. Actualmente hay {len(mediciones)}."
        )

    X_lista = []
    y_lista = []
    X_normales_lista = []

    for med in mediciones:
        vector = extraer_features_medicion(med)
        etiqueta = normalizar_etiqueta_estado(med.estado_medicion)
        X_lista.append(vector)
        y_lista.append(etiqueta)

        if etiqueta == "normal":
            X_normales_lista.append(vector)

    X_total = np.vstack(X_lista)
    y_total = np.array(y_lista)

    # Si por alguna razon hay muy pocas muestras etiquetadas como 'normal',
    # se usa el conjunto total con mayor contaminacion para no bloquear el entrenamiento
    if len(X_normales_lista) >= 15:
        X_iforest = np.vstack(X_normales_lista)
    else:
        X_iforest = X_total

    modelo_if, scaler_if, resumen_if = entrenar_isolation_forest(
        X_normales=X_iforest,
        contamination=contamination,
        n_estimators=n_estimators,
    )

    modelo_rf, scaler_rf, metricas_rf = entrenar_random_forest(
        X=X_total,
        y=y_total,
        n_estimators=n_estimators,
    )

    fecha_actual = datetime.now(timezone.utc).isoformat()
    metadata = {
        "modelo_version": MODELO_VERSION,
        "fecha_entrenamiento": fecha_actual,
        "total_muestras": int(X_total.shape[0]),
        "feature_names": FEATURE_NAMES,
        "parametros_iforest": resumen_if,
        "metricas_clasificador": metricas_rf,
    }

    guardar_modelos_en_disco(
        modelo_if=modelo_if,
        scaler_if=scaler_if,
        modelo_rf=modelo_rf,
        scaler_rf=scaler_rf,
        metadata=metadata,
    )

    return metadata


def predecir_anomalia(medicion: Any, artefactos: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Evalua una medicion con Isolation Forest.
    Retorna:
      - es_anomalia (bool): True si el modelo predice -1 (outlier).
      - score_anomalia (float): Puntaje de decision_function (negativo indica anomalia).
      - severidad_anomalia (float): Valor normalizado entre 0.0 (normal) y 1.0 (altamente anomalo).
    """
    if artefactos is None:
        artefactos = cargar_modelos_desde_disco()
    if not artefactos:
        raise RuntimeError("El sistema de analisis aun no esta activado.")

    vector = extraer_features_medicion(medicion).reshape(1, -1)
    X_scaled = artefactos["scaler_if"].transform(vector)

    pred = int(artefactos["isolation_forest"].predict(X_scaled)[0])
    decision_score = float(artefactos["isolation_forest"].decision_function(X_scaled)[0])

    # Transformacion sigmoidea invertida para mapear decision_score a [0, 1]
    # En IsolationForest, decision_score < 0 es anomalia y > 0 es normal.
    severidad = float(1.0 / (1.0 + np.exp(5.0 * decision_score)))

    return {
        "es_anomalia": pred == -1,
        "score_anomalia": round(decision_score, 4),
        "severidad_anomalia": round(severidad, 4),
    }


def clasificar_estado(medicion: Any, artefactos: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Clasifica el estado operativo de la medicion usando Random Forest Classifier.
    Si el clasificador predice 'normal' con baja confianza pero Isolation Forest detecta
    una anomalia severa, se ajusta preventivamente o se reporta en los metadatos.
    """
    if artefactos is None:
        artefactos = cargar_modelos_desde_disco()
    if not artefactos:
        raise RuntimeError("El sistema de analisis aun no esta activado.")

    vector = extraer_features_medicion(medicion).reshape(1, -1)
    X_scaled = artefactos["scaler_rf"].transform(vector)

    rf_model: RandomForestClassifier = artefactos["random_forest"]
    probas = rf_model.predict_proba(X_scaled)[0]
    clases = rf_model.classes_

    idx_max = int(np.argmax(probas))
    clase_predicha = str(clases[idx_max])
    probabilidad_max = float(probas[idx_max])

    distribucion_probabilidades = {
        str(clase): round(float(prob), 4)
        for clase, prob in zip(clases, probas)
    }

    return {
        "clase_predicha": clase_predicha,
        "probabilidad": round(probabilidad_max, 4),
        "probabilidades_por_clase": distribucion_probabilidades,
    }


def _calcular_pendiente_normalizada(valores: np.ndarray, escala_referencia: float) -> float:
    """
    Calcula la pendiente lineal (tendencia temporal) de una serie usando minimos cuadrados
    y la normaliza en el rango [0.0, 1.0] cuando la tendencia es creciente.
    """
    n = len(valores)
    if n < 3:
        return 0.0
    x = np.arange(n, dtype=np.float64)
    pendiente, _ = np.polyfit(x, valores, 1)
    # Solo penalizamos pendientes positivas (aumento de THD, temperatura, desbalance)
    if pendiente <= 0:
        return 0.0
    return float(min(1.0, (pendiente * n) / escala_referencia))


def calcular_riesgo_falla(
    db: Session,
    equipo_id: int,
    ventana_n: int = 30,
    artefactos: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Analiza las ultimas N mediciones de un equipo mediante una ventana deslizante.
    Combina 4 factores fisicos y estadisticos para obtener un score de riesgo [0, 1]
    y estimar el horizonte temporal en minutos hasta una posible falla critica:
      1. Proporcion de mediciones anomalas / estados no normales en la ventana (peso 35%).
      2. Severidad media de anomalias segun Isolation Forest en las ultimas muestras (peso 25%).
      3. Tendencia creciente (pendiente positiva) en THD, temperatura y desbalance (peso 25%).
      4. Probabilidad acumulada de clases de falla/sobrecarga en la medicion mas reciente (peso 15%).
    """
    if artefactos is None:
        artefactos = cargar_modelos_desde_disco()
    if not artefactos:
        raise RuntimeError("El sistema de analisis aun no esta activado.")

    mediciones_recientes = (
        db.query(Medicion)
        .filter(Medicion.equipo_id == equipo_id)
        .order_by(desc(Medicion.timestamp))
        .limit(ventana_n)
        .all()
    )

    if not mediciones_recientes:
        raise ValueError(f"No existen mediciones registradas para el equipo {equipo_id}.")

    # Ordenar cronologicamente de mas antigua a mas reciente para el calculo de pendientes
    mediciones_cronologicas = list(reversed(mediciones_recientes))
    n_muestras = len(mediciones_cronologicas)

    matrices_features = np.vstack([extraer_features_medicion(m) for m in mediciones_cronologicas])

    # Evaluacion masiva en Isolation Forest
    X_if_scaled = artefactos["scaler_if"].transform(matrices_features)
    scores_if = artefactos["isolation_forest"].decision_function(X_if_scaled)
    severidades_if = 1.0 / (1.0 + np.exp(5.0 * scores_if))

    # Evaluacion masiva en Random Forest
    X_rf_scaled = artefactos["scaler_rf"].transform(matrices_features)
    rf_model: RandomForestClassifier = artefactos["random_forest"]
    clases_predichas = rf_model.predict(X_rf_scaled)
    probas_todas = rf_model.predict_proba(X_rf_scaled)

    # Factor 1: Proporcion ponderada de estados anomalos en la ventana
    pesos_severidad_clase = {
        "normal": 0.0,
        "fp_bajo": 0.45,
        "thd_alto": 0.60,
        "sobrecarga": 0.80,
        "falla_critica": 1.00,
    }
    puntajes_clases = [pesos_severidad_clase.get(str(c), 0.75) for c in clases_predichas]
    # Dar mayor peso a las mediciones mas recientes dentro de la ventana
    pesos_temporales = np.linspace(0.5, 1.5, n_muestras)
    factor_proporcion_anomala = float(np.average(puntajes_clases, weights=pesos_temporales))

    # Factor 2: Severidad media de Isolation Forest
    factor_severidad_if = float(np.average(severidades_if, weights=pesos_temporales))

    # Factor 3: Tendencias temporales (pendientes de degradacion)
    # Indices en FEATURE_NAMES: 6=thd, 8=factor_potencia, 9=temperatura_gabinete, 10=desbalance_voltaje_pct
    serie_thd = matrices_features[:, 6]
    serie_fp = matrices_features[:, 8]
    serie_temp = matrices_features[:, 9]
    serie_desb_v = matrices_features[:, 10]

    tendencia_thd = _calcular_pendiente_normalizada(serie_thd, escala_referencia=5.0)
    tendencia_temp = _calcular_pendiente_normalizada(serie_temp, escala_referencia=10.0)
    tendencia_desb = _calcular_pendiente_normalizada(serie_desb_v, escala_referencia=3.0)
    # Para factor de potencia penalizamos la caida (pendiente de -serie_fp)
    tendencia_fp = _calcular_pendiente_normalizada(-serie_fp, escala_referencia=0.10)

    factor_tendencia = float(
        0.35 * tendencia_temp + 0.30 * tendencia_thd + 0.20 * tendencia_desb + 0.15 * tendencia_fp
    )

    # Factor 4: Probabilidad de estado no normal en la ultima medicion
    clases_modelo = list(rf_model.classes_)
    ultima_proba = probas_todas[-1]
    if "normal" in clases_modelo:
        idx_normal = clases_modelo.index("normal")
        factor_prob_actual = float(1.0 - ultima_proba[idx_normal])
    else:
        factor_prob_actual = 1.0

    # Calculo del score compuesto de riesgo [0.0000, 1.0000]
    riesgo_bruto = (
        0.35 * factor_proporcion_anomala
        + 0.25 * factor_severidad_if
        + 0.25 * factor_tendencia
        + 0.15 * factor_prob_actual
    )
    riesgo_falla = float(np.clip(riesgo_bruto, 0.0, 1.0))

    # Estimacion del horizonte temporal en minutos (horizonte_estimado_min)
    # Cuanto mayor es el riesgo y la velocidad de degradacion, menor es el tiempo hasta la falla.
    if riesgo_falla < 0.20:
        nivel_alerta = "bajo"
        horizonte_min = 720  # 12 horas (operacion estable)
    elif riesgo_falla < 0.50:
        nivel_alerta = "moderado"
        # Interpolacion lineal entre 360 min y 120 min
        horizonte_min = int(360 - ((riesgo_falla - 0.20) / 0.30) * 240)
    elif riesgo_falla < 0.75:
        nivel_alerta = "alto"
        # Interpolacion lineal entre 120 min y 25 min
        horizonte_min = int(120 - ((riesgo_falla - 0.50) / 0.25) * 95)
    else:
        nivel_alerta = "critico"
        # Interpolacion lineal entre 25 min y 2 min
        horizonte_min = max(2, int(25 - ((riesgo_falla - 0.75) / 0.25) * 23))

    # Si hay pendiente de degradacion rapida, acortar el horizonte proporcionalmente
    if factor_tendencia > 0.4:
        factor_aceleracion = max(0.4, 1.0 - 0.5 * factor_tendencia)
        horizonte_min = max(1, int(horizonte_min * factor_aceleracion))

    # Determinar la clase predominante en las ultimas mediciones
    valores_clases, conteos_clases = np.unique(clases_predichas[-min(10, n_muestras):], return_counts=True)
    clase_predominante = str(valores_clases[int(np.argmax(conteos_clases))])

    version = artefactos["metadata"].get("modelo_version", MODELO_VERSION)

    return {
        "equipo_id": equipo_id,
        "timestamp_evaluacion": datetime.now(timezone.utc),
        "mediciones_analizadas": n_muestras,
        "riesgo_falla": round(riesgo_falla, 4),
        "nivel_alerta": nivel_alerta,
        "horizonte_estimado_min": horizonte_min,
        "clase_predominante_reciente": clase_predominante,
        "factores_contribuyentes": {
            "proporcion_anomala_ventana": round(factor_proporcion_anomala, 4),
            "severidad_isolation_forest": round(factor_severidad_if, 4),
            "tendencia_degradacion": round(factor_tendencia, 4),
            "probabilidad_falla_instantanea": round(factor_prob_actual, 4),
        },
        "modelo_version": version,
    }


def ejecutar_prediccion_completa(
    db: Session,
    equipo_id: int,
    medicion: Any,
    ventana_n: int = 30,
    guardar_en_bd: bool = True,
) -> Optional[Dict[str, Any]]:
    """
    Funcion integradora que ejecuta las 3 etapas (Isolation Forest, Random Forest
    y Ventana Deslizante de Riesgo) sobre una nueva medicion y guarda el resultado
    en la tabla predicciones_ml.
    Si el modelo aun no ha sido entrenado, retorna None de forma segura sin lanzar error.
    """
    artefactos = cargar_modelos_desde_disco()
    if not artefactos:
        return None

    res_anomalia = predecir_anomalia(medicion, artefactos=artefactos)
    res_clasificacion = clasificar_estado(medicion, artefactos=artefactos)
    res_riesgo = calcular_riesgo_falla(
        db=db,
        equipo_id=equipo_id,
        ventana_n=ventana_n,
        artefactos=artefactos,
    )

    clase_final = res_clasificacion["clase_predicha"]
    probabilidad_final = res_clasificacion["probabilidad"]

    # Regla de consenso hibrido: Si el clasificador dice 'normal' con confianza moderada,
    # pero Isolation Forest detecta una anomalia severa, marcamos como 'falla_critica'
    if clase_final == "normal" and res_anomalia["es_anomalia"] and res_anomalia["severidad_anomalia"] > 0.78:
        clase_final = "falla_critica"
        probabilidad_final = res_anomalia["severidad_anomalia"]

    version = artefactos["metadata"].get("modelo_version", MODELO_VERSION)
    ts_medicion = getattr(medicion, "timestamp", None) or datetime.now(timezone.utc)

    # Generar diagnostico tecnico detallado con consecuencias y acciones
    diagnostico = generar_diagnostico_detallado(
        clase_predicha=clase_final,
        probabilidad=probabilidad_final,
        riesgo_falla=res_riesgo["riesgo_falla"],
        horizonte_min=res_riesgo["horizonte_estimado_min"],
        medicion=medicion,
    )

    nueva_prediccion = PrediccionML(
        equipo_id=equipo_id,
        timestamp=ts_medicion,
        clase_predicha=clase_final,
        probabilidad=probabilidad_final,
        riesgo_falla=res_riesgo["riesgo_falla"],
        horizonte_estimado_min=res_riesgo["horizonte_estimado_min"],
        modelo_version=version,
    )

    if guardar_en_bd:
        db.add(nueva_prediccion)
        db.commit()
        db.refresh(nueva_prediccion)

    return {
        "id": nueva_prediccion.id,
        "equipo_id": equipo_id,
        "timestamp": nueva_prediccion.timestamp,
        "clase_predicha": clase_final,
        "probabilidad": float(probabilidad_final),
        "riesgo_falla": float(res_riesgo["riesgo_falla"]),
        "horizonte_estimado_min": res_riesgo["horizonte_estimado_min"],
        "modelo_version": version,
        "es_anomalia_aislada": res_anomalia["es_anomalia"],
        "score_anomalia": res_anomalia["score_anomalia"],
        "diagnostico": diagnostico,
    }