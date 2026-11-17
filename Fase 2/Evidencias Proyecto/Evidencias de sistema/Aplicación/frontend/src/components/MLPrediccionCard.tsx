import React, { useEffect, useState } from "react";
import { obtenerRiesgoEquipo } from "../api/ml";
import type { RiesgoEquipoResponse } from "../api/ml";

interface Props {
  equipoId: number;
}

// Nombre amigable de cada estado (sin siglas ni tecnicismos de informatica)
const NOMBRES_CLASE: Record<string, string> = {
  normal: "Normal",
  thd_alto: "THD alto",
  fp_bajo: "FP bajo",
  sobrecarga: "Sobrecarga",
  falla_critica: "Falla crítica",
};

export const MLPrediccionCard: React.FC<Props> = ({ equipoId }) => {
  const [riesgoData, setRiesgoData] = useState<RiesgoEquipoResponse | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);

  useEffect(() => {
    const cargarRiesgo = async () => {
      try {
        setLoading(true);
        const data = await obtenerRiesgoEquipo(equipoId);
        setRiesgoData(data);
        setError(null);
      } catch (err: any) {
        setError("No se pudo cargar el análisis de riesgo.");
      } finally {
        setLoading(false);
      }
    };

    cargarRiesgo();
    const intervalo = setInterval(cargarRiesgo, 15000);
    return () => clearInterval(intervalo);
  }, [equipoId]);

  if (loading && !riesgoData) {
    return (
      <div className="p-4 text-sm text-gray-400">
        Analizando el comportamiento eléctrico del equipo...
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-sm text-red-500">{error}</div>;
  }

  if (!riesgoData) return null;

  const coloresAlerta: Record<string, string> = {
    bajo: "text-green-400 border-green-500/30 bg-green-500/10",
    moderado: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
    alto: "text-orange-400 border-orange-500/30 bg-orange-500/10",
    critico: "text-red-500 border-red-500/40 bg-red-500/15 animate-pulse",
  };

  const estiloNivel =
    coloresAlerta[riesgoData.nivel_alerta] ||
    "text-gray-400 border-gray-700 bg-gray-800";
  const porcentajeRiesgo = (riesgoData.riesgo_falla * 100).toFixed(1);
  const diag = riesgoData.diagnostico;
  const etiqueta =
    NOMBRES_CLASE[riesgoData.clase_predominante_reciente] ??
    riesgoData.clase_predominante_reciente.replace(/_/g, " ");

  return (
    <div
      className={`p-5 rounded-xl border ${estiloNivel} shadow-lg backdrop-blur-sm transition-all duration-300`}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-semibold tracking-wide uppercase">
          Pronóstico de Fallas — PowerGuardian Pro
        </h3>
        <span className="text-xs px-2.5 py-1 rounded-full font-mono bg-black/40 border border-current">
          Versión {riesgoData.modelo_version}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Score de Riesgo */}
        <div className="bg-black/30 p-3.5 rounded-lg border border-white/5">
          <span className="text-xs text-gray-400 block mb-1">
            Indice de Riesgo de Falla
          </span>
          <div className="text-2xl font-bold font-mono">
            {porcentajeRiesgo}%
          </div>
          <div className="w-full bg-gray-700 h-2 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-current transition-all duration-500"
              style={{ width: `${porcentajeRiesgo}%` }}
            />
          </div>
        </div>

        {/* Horizonte Temporal */}
        <div className="bg-black/30 p-3.5 rounded-lg border border-white/5">
          <span className="text-xs text-gray-400 block mb-1">
            Tiempo estimado hasta la falla
          </span>
          <div className="text-2xl font-bold font-mono">
            {riesgoData.horizonte_estimado_min !== null
              ? `${riesgoData.horizonte_estimado_min} min`
              : "N/D"}
          </div>
          <span className="text-xs text-gray-300 mt-1 block">
            Alerta:{" "}
            <strong className="uppercase">{riesgoData.nivel_alerta}</strong>
          </span>
        </div>

        {/* Estado Predominante */}
        <div className="bg-black/30 p-3.5 rounded-lg border border-white/5">
          <span className="text-xs text-gray-400 block mb-1">
            Estado reciente detectado
          </span>
          <div className="text-lg font-semibold font-mono uppercase mt-1 truncate">
            {etiqueta}
          </div>
          <span className="text-xs text-gray-400 mt-1 block">
            Basado en {riesgoData.mediciones_analizadas} lecturas
          </span>
        </div>
      </div>

      {/* Diagnostico Detallado */}
      {diag && riesgoData.nivel_alerta !== "bajo" && (
        <div className="mb-4 bg-black/40 rounded-lg border border-white/10 overflow-hidden">
          <button
            onClick={() => setMostrarDetalle(!mostrarDetalle)}
            className="w-full px-4 py-3 flex justify-between items-center text-left hover:bg-white/5 transition-colors"
          >
            <div>
              <span className="text-sm font-semibold">{diag.titulo}</span>
              <p className="text-xs text-gray-400 mt-0.5">
                {diag.descripcion.substring(0, 120)}...
              </p>
            </div>
            <span className="text-xs text-gray-500 ml-2 shrink-0">
              {mostrarDetalle ? "▲ Ocultar" : "▼ Ver detalle"}
            </span>
          </button>

          {mostrarDetalle && (
            <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-3">
              {/* Indicadores anomalos actuales */}
              {diag.indicadores_anomalos_actuales.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-2">
                    Indicadores fuera de rango
                  </h4>
                  <ul className="space-y-1">
                    {diag.indicadores_anomalos_actuales.map((ind, i) => (
                      <li key={i} className="text-xs text-yellow-300/90 flex items-start gap-2">
                        <span className="text-yellow-500 mt-0.5">●</span>
                        {ind}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Consecuencias posibles */}
              {diag.consecuencias_posibles.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">
                    Si no se corrige, puede ocurrir
                  </h4>
                  <ul className="space-y-1">
                    {diag.consecuencias_posibles.map((cons, i) => (
                      <li key={i} className="text-xs text-red-300/80 flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">▸</span>
                        {cons}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Componentes en riesgo */}
              {diag.componentes_en_riesgo.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2">
                    Componentes en riesgo
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {diag.componentes_en_riesgo.map((comp, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-300"
                      >
                        {comp}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Accion recomendada */}
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
                <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
                  Accion recomendada
                </h4>
                <p className="text-xs text-cyan-200">
                  {diag.accion_recomendada}
                </p>
              </div>

              {/* Norma de referencia */}
              <div className="text-[10px] text-gray-500 text-right">
                Ref: {diag.norma_referencia}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Factores Contribuyentes */}
      <div className="text-xs text-gray-400 border-t border-white/10 pt-3 flex flex-wrap justify-between gap-2">
        <span>
          Deterioro:{" "}
          {(
            riesgoData.factores_contribuyentes.tendencia_degradacion * 100
          ).toFixed(0)}
          %
        </span>
        <span>
          Severidad:{" "}
          {(
            riesgoData.factores_contribuyentes.severidad_isolation_forest * 100
          ).toFixed(0)}
          %
        </span>
        <span>
          Lecturas anómalas:{" "}
          {(
            riesgoData.factores_contribuyentes.proporcion_anomala_ventana * 100
          ).toFixed(0)}
          %
        </span>
      </div>
    </div>
  );
};
