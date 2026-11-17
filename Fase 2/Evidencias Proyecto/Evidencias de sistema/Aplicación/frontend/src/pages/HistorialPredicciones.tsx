import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Layout from "../components/Layout";
import { Encabezado } from "../components/Monitoreo";
import { IconoCortocircuito, IconoIncidencias, IconoParametros, IconoPredicciones } from "../components/Iconos";
import useMedicionEnVivo from "../hooks/useMedicionEnVivo";
import {
  descargarReporte,
  ejecutarPrediccionEquipo,
  obtenerEstadoModelo,
  obtenerHistorialPredicciones,
  obtenerRiesgoEquipo,
} from "../api/ml";
import type {
  EstadoModeloResponse,
  FormatoReporte,
  PrediccionMLResponse,
  RiesgoEquipoResponse,
} from "../api/ml";

const COLOR_CLASE: Record<string, string> = {
  normal: "var(--ok)",
  thd_alto: "var(--warn)",
  fp_bajo: "var(--warn)",
  sobrecarga: "var(--warn)",
  falla_critica: "var(--danger)",
};

const COLOR_CLASE_HEX: Record<string, string> = {
  normal: "#22a06b",
  thd_alto: "#d99a1a",
  fp_bajo: "#d99a1a",
  sobrecarga: "#d99a1a",
  falla_critica: "#e5484d",
};

const CLASES_BASE = ["normal", "thd_alto", "fp_bajo", "sobrecarga", "falla_critica"];

// Nombre amigable de cada estado detectado (sin siglas ni tecnicismos de informatica)
const ETIQUETA_CLASE: Record<string, string> = {
  normal: "Normal",
  thd_alto: "THD alto",
  fp_bajo: "FP bajo",
  sobrecarga: "Sobrecarga",
  falla_critica: "Falla crítica",
};

const etiquetaClase = (clase: string) =>
  ETIQUETA_CLASE[clase] ?? clase.replace(/_/g, " ");

const claseBadge = (clase: string) => {
  if (clase === "normal") return "pgp-badge pgp-badge-ok";
  if (clase === "falla_critica") return "pgp-badge pgp-badge-err";
  return "pgp-badge pgp-badge-warn";
};

const estiloBoton = {
  padding: "5px 12px",
  background: "transparent",
  border: "1px solid var(--border2)",
  borderRadius: "4px",
  color: "var(--txt2)",
  fontSize: "12px",
  cursor: "pointer",
  fontWeight: 600,
} as const;

const estiloBotonPrimario = {
  ...estiloBoton,
  background: "var(--accent)",
  border: "none",
  color: "#fff",
  fontWeight: 700,
} as const;

const chartTooltipStyle = {
  backgroundColor: "var(--bg-card)",
  color: "var(--txt1)",
  border: "1px solid var(--border2)",
  borderRadius: "6px",
  fontSize: "13px",
};

export default function HistorialPredicciones() {
  const { equipos, equipoId, setEquipoId, recibidas } = useMedicionEnVivo();
  const [predicciones, setPredicciones] = useState<PrediccionMLResponse[]>([]);
  const [riesgo, setRiesgo] = useState<RiesgoEquipoResponse | null>(null);
  const [estadoModelo, setEstadoModelo] = useState<EstadoModeloResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [predecindo, setPredecindo] = useState(false);
  const [descargando, setDescargando] = useState<FormatoReporte | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(
    (silencioso = false) => {
      if (!equipoId) return;
      if (!silencioso) setLoading(true);
      setError(null);
      obtenerHistorialPredicciones(equipoId, 200)
        .then(setPredicciones)
        .catch(() => {
          setPredicciones([]);
          setError("No se pudo cargar el historial de análisis.");
        })
        .finally(() => {
          if (!silencioso) setLoading(false);
        });
      obtenerRiesgoEquipo(equipoId)
        .then(setRiesgo)
        .catch(() => setRiesgo(null));
    },
    [equipoId],
  );

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    obtenerEstadoModelo().then(setEstadoModelo).catch(() => setEstadoModelo(null));
  }, []);

  const predecirAhora = async () => {
    if (!equipoId || predecindo) return;
    setPredecindo(true);
    try {
      await ejecutarPrediccionEquipo(equipoId);
      cargar(true);
    } catch {
      setError("No se pudo generar el análisis. Inténtalo de nuevo en unos minutos.");
    } finally {
      setPredecindo(false);
    }
  };

  const descargar = async (formato: FormatoReporte) => {
    if (!equipoId || descargando) return;
    setDescargando(formato);
    try {
      await descargarReporte(equipoId, formato);
    } catch {
      setError("No se pudo descargar el reporte.");
    } finally {
      setDescargando(null);
    }
  };

  // Serie cronologica para el grafico de evolucion
  const evolucion = useMemo(
    () =>
      [...predicciones]
        .reverse()
        .slice(-120)
        .map((p) => {
          const d = new Date(p.timestamp);
          return {
            fecha: d.toLocaleString("es-CL", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            }),
            riesgo: Number((p.riesgo_falla * 100).toFixed(1)),
            probabilidad: Number((p.probabilidad * 100).toFixed(1)),
            clase: p.clase_predicha,
          };
        }),
    [predicciones],
  );

  // Distribucion de clases predichas
  const porClase = useMemo(() => {
    const conteo: Record<string, number> = {};
    for (const p of predicciones) {
      conteo[p.clase_predicha] = (conteo[p.clase_predicha] ?? 0) + 1;
    }
    return CLASES_BASE.filter((c) => (conteo[c] ?? 0) > 0).map((clase) => ({
      clase,
      etiqueta: etiquetaClase(clase),
      cantidad: conteo[clase],
    }));
  }, [predicciones]);

  const ultima = predicciones[0];
  const riesgoPct = riesgo ? Number((riesgo.riesgo_falla * 100).toFixed(1)) : null;
  const claseActual = ultima?.clase_predicha ?? riesgo?.clase_predominante_reciente ?? "-";
  const nivelRiesgo =
    riesgo?.nivel_alerta === "critico" || riesgo?.nivel_alerta === "alto"
      ? "err"
      : riesgo?.nivel_alerta === "moderado"
        ? "warn"
        : "ok";

  const formatoFecha = (ts: string) =>
    new Date(ts).toLocaleString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <Layout>
      <div className="pgp-fade-in" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Barra de herramientas */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <Encabezado
            equipos={equipos}
            equipoId={equipoId}
            setEquipoId={setEquipoId}
            enVivo={recibidas > 0}
          />
          <button onClick={() => cargar()} style={estiloBoton}>
            Actualizar
          </button>
          <button
            onClick={predecirAhora}
            disabled={!equipoId || predecindo}
            style={{
              ...estiloBoton,
              opacity: !equipoId || predecindo ? 0.6 : 1,
              borderColor: "var(--accent)",
              color: "var(--accent)",
            }}
          >
            {predecindo ? "Analizando..." : "Analizar ahora"}
          </button>
          <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
            <button
              onClick={() => descargar("excel")}
              disabled={!equipoId || descargando !== null}
              style={{ ...estiloBotonPrimario, opacity: descargando ? 0.6 : 1 }}
            >
              {descargando === "excel" ? "Generando..." : "Descargar Excel"}
            </button>
            <button
              onClick={() => descargar("pdf")}
              disabled={!equipoId || descargando !== null}
              style={{ ...estiloBotonPrimario, opacity: descargando ? 0.6 : 1 }}
            >
              {descargando === "pdf" ? "Generando..." : "Descargar PDF"}
            </button>
          </div>
        </div>

        {error && <div className="pgp-alert pgp-alert-info">{error}</div>}
        {loading && <div className="pgp-alert pgp-alert-info">Cargando historial de análisis...</div>}

        {/* Franja de KPIs */}
        <div className="pgp-kpi-row">
          <div className="pgp-kpi">
            <div
              className="pgp-kpi-icon"
              style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
            >
              <IconoPredicciones />
            </div>
            <div className="pgp-kpi-val accent">{predicciones.length}</div>
            <div className="pgp-kpi-label">Análisis registrados</div>
          </div>
          <div className="pgp-kpi">
            <div
              className="pgp-kpi-icon"
              style={{
                background: "var(--accent-bg)",
                color: COLOR_CLASE[claseActual] ?? "var(--accent)",
              }}
            >
              <IconoIncidencias />
            </div>
            <div
              className={`pgp-kpi-val ${
                claseActual === "falla_critica" ? "err" : claseActual === "normal" ? "ok" : "warn"
              }`}
              style={{ fontSize: "18px" }}
            >
              {etiquetaClase(claseActual)}
            </div>
            <div className="pgp-kpi-label">Estado actual detectado</div>
          </div>
          <div className="pgp-kpi">
            <div
              className="pgp-kpi-icon"
              style={{
                background:
                  nivelRiesgo === "err"
                    ? "var(--danger-bg)"
                    : nivelRiesgo === "warn"
                      ? "var(--warn-bg)"
                      : "var(--ok-bg)",
                color:
                  nivelRiesgo === "err"
                    ? "var(--danger)"
                    : nivelRiesgo === "warn"
                      ? "var(--warn)"
                      : "var(--ok)",
              }}
            >
              <IconoCortocircuito />
            </div>
            <div className={`pgp-kpi-val ${riesgoPct !== null ? nivelRiesgo : ""}`}>
              {riesgoPct !== null ? `${riesgoPct}%` : "-"}
            </div>
            <div className="pgp-kpi-label">Riesgo de falla actual</div>
          </div>
          <div className="pgp-kpi">
            <div
              className="pgp-kpi-icon"
              style={{
                background: estadoModelo?.entrenado ? "var(--ok-bg)" : "var(--warn-bg)",
                color: estadoModelo?.entrenado ? "var(--ok)" : "var(--warn)",
              }}
            >
              <IconoParametros />
            </div>
            <div
              className={`pgp-kpi-val ${estadoModelo?.entrenado ? "ok" : "warn"}`}
              style={{ fontSize: "18px" }}
            >
              {estadoModelo?.modelo_version ?? (estadoModelo ? "No disponible" : "...")}
            </div>
            <div className="pgp-kpi-label">Versión del sistema</div>
          </div>
        </div>

        {/* Grafico 1: evolucion riesgo / probabilidad */}
        <div className="pgp-card">
          <div className="pgp-card-title">Evolución del Riesgo de Falla en el Tiempo</div>
          {evolucion.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--txt3)", padding: "30px", fontSize: "13px" }}>
              Todavía no hay análisis para este equipo. Pulsa «Analizar ahora» para generar el primero.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={evolucion}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="fecha" stroke="var(--txt3)" fontSize={11} minTickGap={30} />
                <YAxis stroke="var(--txt3)" fontSize={12} domain={[0, 100]} unit="%" />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Line
                  type="monotone"
                  dataKey="riesgo"
                  name="Riesgo de falla (%)"
                  stroke="var(--danger)"
                  strokeWidth={2}
                  dot={false}
                  animationDuration={400}
                />
                <Line
                  type="monotone"
                  dataKey="probabilidad"
                  name="Confianza del resultado (%)"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={false}
                  animationDuration={400}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Grafico 2: distribucion de clases */}
        <div className="pgp-card">
          <div className="pgp-card-title">Tipos de Estado Detectados</div>
          {porClase.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--txt3)", padding: "30px", fontSize: "13px" }}>
              Sin datos
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={porClase}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="etiqueta" stroke="var(--txt3)" fontSize={12} />
                <YAxis stroke="var(--txt3)" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: "var(--accent-bg)" }} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="cantidad" name="Cantidad de análisis" animationDuration={400}>
                  {porClase.map((c) => (
                    <Cell key={c.clase} fill={COLOR_CLASE_HEX[c.clase] ?? "#6b7280"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tabla historial */}
        <div className="pgp-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="pgp-card-title" style={{ padding: "12px 14px 0" }}>
            Historial de Análisis
            <span style={{ fontWeight: 400, color: "var(--txt3)", fontSize: "12px" }}>
              {" "}· {predicciones.length} registro(s) · incluido en los reportes Excel/PDF
            </span>
          </div>
          <table className="pgp-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Estado detectado</th>
                <th>Confianza</th>
                <th>Riesgo de falla</th>
                <th>Tiempo hasta falla (min)</th>
                <th>Versión</th>
              </tr>
            </thead>
            <tbody>
              {predicciones.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "30px", color: "var(--txt3)" }}>
                    Todavía no hay análisis registrados para este equipo
                  </td>
                </tr>
              ) : (
                predicciones.map((p) => {
                  const riesgoP = Number((p.riesgo_falla * 100).toFixed(1));
                  return (
                    <tr key={p.id}>
                      <td style={{ fontSize: "12px" }}>{formatoFecha(p.timestamp)}</td>
                      <td>
                        <span className={claseBadge(p.clase_predicha)}>
                          {etiquetaClase(p.clase_predicha)}
                        </span>
                      </td>
                      <td className="mono">{(p.probabilidad * 100).toFixed(1)}%</td>
                      <td
                        className="mono"
                        style={{
                          color:
                            riesgoP >= 75
                              ? "var(--danger)"
                              : riesgoP >= 50
                                ? "var(--warn)"
                                : "var(--txt1)",
                          fontWeight: riesgoP >= 50 ? 700 : 400,
                        }}
                      >
                        {riesgoP}%
                      </td>
                      <td className="mono">{p.horizonte_estimado_min ?? "-"}</td>
                      <td style={{ fontSize: "12px" }}>{p.modelo_version}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
