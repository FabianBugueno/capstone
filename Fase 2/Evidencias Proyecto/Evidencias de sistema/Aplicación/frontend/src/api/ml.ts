import api from "./axios";

export interface DiagnosticoDetallado {
  titulo: string;
  descripcion: string;
  consecuencias_posibles: string[];
  componentes_en_riesgo: string[];
  accion_recomendada: string;
  norma_referencia: string;
  indicadores_anomalos_actuales: string[];
  severidad_general: string;
}

export interface RiesgoEquipoResponse {
  equipo_id: number;
  timestamp_evaluacion: string;
  mediciones_analizadas: number;
  riesgo_falla: number;
  nivel_alerta: string;
  horizonte_estimado_min: number | null;
  clase_predominante_reciente: string;
  factores_contribuyentes: {
    proporcion_anomala_ventana: number;
    severidad_isolation_forest: number;
    tendencia_degradacion: number;
    probabilidad_falla_instantanea: number;
  };
  modelo_version: string;
  diagnostico: DiagnosticoDetallado | null;
}

export interface PrediccionMLResponse {
  id: number;
  equipo_id: number;
  timestamp: string;
  clase_predicha: string;
  probabilidad: number;
  riesgo_falla: number;
  horizonte_estimado_min: number | null;
  modelo_version: string;
  es_anomalia_aislada?: boolean;
  score_anomalia?: number;
  diagnostico?: DiagnosticoDetallado | null;
}

export const obtenerRiesgoEquipo = async (
  equipoId: number,
): Promise<RiesgoEquipoResponse> => {
  const response = await api.get<RiesgoEquipoResponse>(
    `/ml/riesgo/${equipoId}`,
  );
  return response.data;
};

export const ejecutarPrediccionEquipo = async (
  equipoId: number,
): Promise<PrediccionMLResponse> => {
  const response = await api.post<PrediccionMLResponse>(
    `/ml/predecir/${equipoId}`,
  );
  return response.data;
};

export interface EstadoModeloResponse {
  entrenado: boolean;
  modelo_version: string | null;
  fecha_entrenamiento: string | null;
  total_muestras_entrenamiento: number | null;
  muestras_normales_iforest: number | null;
  clases_reconocidas: string[] | null;
  metricas_clasificador: Record<string, unknown> | null;
  parametros_iforest: Record<string, unknown> | null;
  ruta_modelos: string;
}

export const obtenerHistorialPredicciones = async (
  equipoId: number,
  limite = 100,
): Promise<PrediccionMLResponse[]> => {
  const response = await api.get<PrediccionMLResponse[]>(
    `/ml/predicciones/${equipoId}`,
    { params: { limite } },
  );
  return response.data;
};

export const obtenerEstadoModelo = async (): Promise<EstadoModeloResponse> => {
  const response = await api.get<EstadoModeloResponse>("/ml/estado");
  return response.data;
};

export type FormatoReporte = "excel" | "pdf";

// Descarga el reporte de incidencias + predicciones (blob autenticado) y lo guarda en el equipo
export const descargarReporte = async (
  equipoId: number,
  formato: FormatoReporte = "excel",
): Promise<void> => {
  const response = await api.get(`/ml/reporte/${equipoId}`, {
    params: { formato },
    responseType: "blob",
  });

  const disposition = String(
    response.headers["content-disposition"] ?? "",
  );
  const coincide = /filename="?([^";]+)"?/.exec(disposition);
  const nombre =
    coincide?.[1] ?? `reporte_pgp_equipo_${equipoId}.${formato === "pdf" ? "pdf" : "xlsx"}`;

  const url = URL.createObjectURL(response.data as Blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
};
