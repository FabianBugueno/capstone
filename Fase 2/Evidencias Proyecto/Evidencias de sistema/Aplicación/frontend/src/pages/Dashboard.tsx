import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  ReferenceArea,
  ReferenceLine,
  Line,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from "recharts";
import api from "../api/axios";
import Layout from "../components/Layout";
import GaugeSVG from "../components/GaugeSVG";
import Lectura, { type Limite } from "../components/Lectura";
import { IconoEquipos, IconoIncidencias, IconoParametros, IconoTendencias } from "../components/Iconos";
import { tooltipStyle } from "../lib/calculos";
import useEnVivo from "../hooks/useEnVivo";

interface EstadoGeneral {
  total_equipos: number;
  equipos_activos: number;
  total_mediciones: number;
}

interface Equipo {
  id: number;
  nombre: string;
  estado: string;
}

interface ResumenEquipo {
  equipo: { id: number; nombre: string; estado: string };
  total_mediciones: number;
  ultima_medicion: {
    timestamp: string | null;
    voltaje_l1: number | null;
    voltaje_l2: number | null;
    voltaje_l3: number | null;
    thd: number | null;
    frecuencia: number | null;
    factor_potencia: number | null;
    temperatura_gabinete?: number | null;
  };
}

interface Medicion {
  timestamp: string;
  voltaje_l1: number;
  voltaje_l2: number;
  voltaje_l3: number;
  thd: number;
  frecuencia: number;
  factor_potencia: number;
}

interface Umbrales {
  voltaje_max: number;
  voltaje_min: number;
  thd_max: number;
  factor_potencia_min: number;
  frecuencia_nominal: number;
}

interface AlertaCount {
  total_activas: number;
  criticas: number;
}

export default function Dashboard() {
  const [estado, setEstado] = useState<EstadoGeneral | null>(null);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [equipoId, setEquipoId] = useState<number | null>(null);
  const [resumen, setResumen] = useState<ResumenEquipo | null>(null);
  const [mediciones, setMediciones] = useState<Medicion[]>([]);
  const [alertas, setAlertas] = useState<AlertaCount>({
    total_activas: 0,
    criticas: 0,
  });
  const [error, setError] = useState("");
  const [umbrales, setUmbrales] = useState<Umbrales | null>(null);

  useEffect(() => {
    api
      .get("/equipos/")
      .then((res) => {
        setEquipos(res.data);
        if (res.data.length > 0) setEquipoId(res.data[0].id);
      })
      .catch(() => {});
  }, []);

  const fetchAlertas = () =>
    api
      .get("/incidencias/activas/count")
      .then((res) => {
        setAlertas(res.data);
      })
      .catch(() => {});

  useEffect(() => {
    api
      .get("/dashboard/estado-general")
      .then((res) => {
        setEstado(res.data);
        setError("");
      })
      .catch(() => setError("Error cargando estado general"));
    fetchAlertas();
  }, []);

  useEffect(() => {
    if (!equipoId) return;

    api
      .get(`/parametros/${equipoId}`)
      .then((res) => setUmbrales(res.data))
      .catch(() => setUmbrales(null));

    api
      .get(`/dashboard/resumen/${equipoId}`)
      .then((res) => setResumen(res.data))
      .catch(() => setResumen(null));

    api
      .get(`/mediciones/?equipo_id=${equipoId}`)
      .then((res) => setMediciones(res.data.reverse().slice(-20)))
      .catch(() => setMediciones([]));
  }, [equipoId]);

  useEnVivo({
    medicion: (m) => {
      setEstado((p) => p && { ...p, total_mediciones: p.total_mediciones + 1 });
      if (m.equipo_id !== equipoId) return;
      const nueva = m as unknown as Medicion;
      setMediciones((p) => [...p, nueva].slice(-20));
      setResumen((p) => p && { ...p, total_mediciones: p.total_mediciones + 1, ultima_medicion: nueva });
    },
    incidencia: fetchAlertas,
  });

  const um = resumen?.ultima_medicion;

  // Limites del equipo (parametros_config); por defecto los mismos que crea el simulador
  const u = umbrales ?? { voltaje_max: 240, voltaje_min: 210, thd_max: 5, factor_potencia_min: 0.9, frecuencia_nominal: 50 };
  const limV: Limite = { min: Number(u.voltaje_min), max: Number(u.voltaje_max), texto: `Rango ${Number(u.voltaje_min)}–${Number(u.voltaje_max)} V` };
  const limThd: Limite = { max: Number(u.thd_max), texto: `Máx ${Number(u.thd_max)} % IEEE 519` };
  const limFp: Limite = { min: Number(u.factor_potencia_min), texto: `Mín ${Number(u.factor_potencia_min)}` };
  const fn = Number(u.frecuencia_nominal);
  const limHz: Limite = { min: fn - 0.5, max: fn + 0.5, texto: `Nominal ${fn} ± 0,5 Hz` };
  const num = (v: unknown) => (v == null || v === "" ? null : Number(v));
  const serie = (k: keyof Medicion) => mediciones.map((m) => Number(m[k])).filter(Number.isFinite);

  // Estado del equipo en una frase que queda visible (el pop-up de 5 s solo la anuncia)
  const fueraDeLimite: string[] = [];
  if (um) {
    const chequear = (nombre: string, v: unknown, l: Limite, unidad: string) => {
      const n = num(v);
      if (n == null) return;
      if (l.max != null && n > l.max) fueraDeLimite.push(`${nombre} ${n}${unidad} sobre ${l.max}${unidad}`);
      else if (l.min != null && n < l.min) fueraDeLimite.push(`${nombre} ${n}${unidad} bajo ${l.min}${unidad}`);
    };
    chequear("V L1", um.voltaje_l1, limV, " V");
    chequear("V L2", um.voltaje_l2, limV, " V");
    chequear("V L3", um.voltaje_l3, limV, " V");
    chequear("THD", um.thd, limThd, " %");
    chequear("FP", um.factor_potencia, limFp, "");
    chequear("Frecuencia", um.frecuencia, limHz, " Hz");
  }
  const nivelFranja = alertas.criticas > 0 ? "err" : fueraDeLimite.length > 0 ? "warn" : "ok";

  // Cards clickeables: llevan a la pestaña de detalle con el mismo equipo seleccionado
  const navigate = useNavigate();
  const ir = (path: string, titulo: string) => {
    const abrir = () => {
      if (equipoId) localStorage.setItem("equipoId", String(equipoId));
      navigate(path);
    };
    return {
      role: "link",
      tabIndex: 0,
      title: titulo,
      onClick: abrir,
      onKeyDown: (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          abrir();
        }
      },
    };
  };

  const fpColor = (v: number | null) => {
    if (!v) return "var(--txt3)";
    if (v >= 0.92) return "var(--ok)";
    if (v >= 0.85) return "var(--warn)";
    return "var(--danger)";
  };

  const thdColor = (v: number | null) => {
    if (!v) return "var(--txt3)";
    return v <= 5 ? "var(--ok)" : "var(--danger)";
  };

  return (
    <Layout>
      <div className="pgp-fade-in" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {error && (
          <div className="pgp-alert pgp-alert-err">{error}</div>
        )}

        {resumen?.equipo?.nombre && um?.timestamp && (
          <section className={`pgp-estado pgp-estado-${nivelFranja}`} aria-live="polite">
            <span className="pgp-estado-tag">
              {nivelFranja === "err" ? "Crítico" : nivelFranja === "warn" ? "Atención" : "Normal"}
            </span>
            <div className="pgp-estado-txt">
              <strong>
                {resumen.equipo.nombre.trim()}:{" "}
                {alertas.criticas > 0
                  ? `${alertas.criticas} alertas críticas activas`
                  : fueraDeLimite.length > 0
                    ? "lecturas fuera de límite"
                    : "operación normal, todos los parámetros dentro de rango"}
              </strong>
              <span>{fueraDeLimite.length > 0 ? `Ahora: ${fueraDeLimite.join(" · ")}` : "Ahora: todas las lecturas dentro de rango"}</span>
            </div>
            <button className="pgp-estado-btn" onClick={() => navigate("/incidencias?estado=activa")}>
              Ver incidencias
            </button>
          </section>
        )}

        {/* Franja de KPIs */}
        <div className="pgp-kpi-row">
          <div className="pgp-kpi pgp-clickable" {...ir("/equipos", "Ver equipos")}>
            <div className="pgp-kpi-icon" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
              <IconoEquipos />
            </div>
            <div className="pgp-kpi-val accent">{estado?.total_equipos ?? "-"}</div>
            <div className="pgp-kpi-label">Total equipos</div>
          </div>
          <div className="pgp-kpi pgp-clickable" {...ir("/equipos", "Ver equipos")}>
            <div className="pgp-kpi-icon" style={{ background: "var(--ok-bg)", color: "var(--ok)" }}>
              <IconoParametros />
            </div>
            <div className="pgp-kpi-val ok">{estado?.equipos_activos ?? "-"}</div>
            <div className="pgp-kpi-label">Equipos activos</div>
          </div>
          <div className="pgp-kpi pgp-clickable" {...ir("/graficos", "Ver tendencias eléctricas")}>
            <div className="pgp-kpi-icon" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
              <IconoTendencias />
            </div>
            <div className="pgp-kpi-val accent">{estado?.total_mediciones?.toLocaleString("es-CL") ?? "-"}</div>
            <div className="pgp-kpi-label">Mediciones (últimos 7 días)</div>
          </div>
          <div className="pgp-kpi pgp-clickable" {...ir("/incidencias?estado=activa", "Ver alertas activas")}>
            <div
              className="pgp-kpi-icon"
              style={{
                background: alertas.criticas > 0 ? "var(--danger-bg)" : "var(--ok-bg)",
                color: alertas.criticas > 0 ? "var(--danger)" : "var(--ok)",
              }}
            >
              <IconoIncidencias />
            </div>
            <div className={`pgp-kpi-val ${alertas.criticas > 0 ? "err" : "ok"}`}>{alertas.total_activas}</div>
            <div className="pgp-kpi-label">
              Alertas activas
              {alertas.criticas > 0 && <span className="pgp-kpi-sub">{alertas.criticas.toLocaleString("es-CL")} críticas</span>}
            </div>
          </div>
        </div>

        {/* Selector equipo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--txt2)", display: "flex", alignItems: "center", gap: "8px" }}>
            Equipo monitoreado
            <select
              value={equipoId ?? ""}
              onChange={(e) => setEquipoId(Number(e.target.value))}
              style={{
                padding: "7px 10px",
                minWidth: "220px",
                background: "var(--bg-card)",
                border: "1px solid var(--border2)",
                borderRadius: "6px",
                color: "var(--txt1)",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              {equipos.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.nombre} ({eq.estado})
                </option>
              ))}
            </select>
          </label>
          {resumen?.equipo && (
            <span className={`pgp-badge ${resumen.equipo.estado === "activo" ? "pgp-badge-ok" : "pgp-badge-err"}`}>
              {resumen.equipo.estado === "activo" ? "Activo" : resumen.equipo.estado}
            </span>
          )}
          {um?.timestamp && (
            <span style={{ marginLeft: "auto", fontSize: "13px", color: "var(--txt3)" }}>
              Última lectura {new Date(um.timestamp).toLocaleTimeString("es-CL")} · {resumen?.total_mediciones?.toLocaleString("es-CL")} mediciones del equipo
            </span>
          )}
        </div>

        {resumen?.equipo?.id && um?.timestamp ? (
          <>
            {/* Hoja de lecturas: cada lectura con su historial y su limite */}
            <div className="pgp-card pgp-clickable" style={{ padding: 0 }} {...ir("/parametros-electricos", "Ver parámetros eléctricos")}>
              <div className="pgp-card-title" style={{ padding: "16px 20px 0", marginBottom: "4px" }}>
                Indicadores PGP
              </div>
              <div className="pgp-lecturas">
                <Lectura label="Voltaje L1" valor={num(um.voltaje_l1)} unidad="V" decimales={1} limite={limV} historial={serie("voltaje_l1")} />
                <Lectura label="Voltaje L2" valor={num(um.voltaje_l2)} unidad="V" decimales={1} limite={limV} historial={serie("voltaje_l2")} />
                <Lectura label="Voltaje L3" valor={num(um.voltaje_l3)} unidad="V" decimales={1} limite={limV} historial={serie("voltaje_l3")} />
                <Lectura label="THD-V" valor={num(um.thd)} unidad="%" decimales={1} limite={limThd} historial={serie("thd")} />
                <Lectura label="Factor de potencia (cos φ)" valor={num(um.factor_potencia)} decimales={3} limite={limFp} historial={serie("factor_potencia")} />
                <Lectura label="Frecuencia" valor={num(um.frecuencia)} unidad="Hz" decimales={2} limite={limHz} historial={serie("frecuencia")} />
              </div>
            </div>

            <div className="pgp-grid-2">
              <div className="pgp-card pgp-clickable" {...ir("/graficos", "Ver tendencias eléctricas")}>
                <div className="pgp-card-title">Tendencia Voltaje L1</div>
                {mediciones.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={mediciones}>
                      <YAxis domain={[limV.min! - 30, limV.max! + 30]} allowDataOverflow stroke="var(--txt3)" fontSize={12} width={44} />
                      <ReferenceArea y1={limV.min} y2={limV.max} fill="var(--ok)" fillOpacity={0.06} />
                      <ReferenceLine y={limV.min} stroke="var(--txt3)" strokeDasharray="4 3" />
                      <ReferenceLine y={limV.max} stroke="var(--txt3)" strokeDasharray="4 3" />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line type="monotone" dataKey="voltaje_l1" name="Voltaje L1 (V)" stroke="var(--phase-1)" dot={false} strokeWidth={2} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ color: "var(--txt3)", fontSize: "13px" }}>Sin datos disponibles</p>
                )}
              </div>

            {/* Gauges */}
            <div className="pgp-card">
              <div className="pgp-card-title">
                Calidad de energía (IEC 61000)
              </div>
              <div className="pgp-gauges">
                <div className="pgp-clickable pgp-clickable-gauge" {...ir("/compensacion", "Ver compensación activa")}>
                  <GaugeSVG
                    value={Number(um.factor_potencia) || 0}
                    max={1}
                    label="Factor Potencia"
                    unit="cos phi"
                    color={fpColor(um.factor_potencia)}
                  />
                </div>
                <div className="pgp-clickable pgp-clickable-gauge" {...ir("/armonicos", "Ver análisis armónico")}>
                  <GaugeSVG
                    value={Number(um.thd) || 0}
                    max={15}
                    label="THD (%)"
                    unit="%"
                    color={thdColor(um.thd)}
                  />
                </div>
                <div className="pgp-clickable pgp-clickable-gauge" {...ir("/forma-onda", "Ver forma de onda")}>
                  <GaugeSVG
                    value={Number(um.frecuencia) || 0}
                    max={51}
                    label="Frecuencia"
                    unit="Hz"
                    color="var(--accent)"
                  />
                </div>
                <GaugeSVG
                  value={Number(um.temperatura_gabinete) || 0}
                  max={80}
                  label="Temperatura Gabinete"
                  unit="°C"
                  color={
                    Number(um.temperatura_gabinete) > 55
                      ? "var(--danger)"
                      : Number(um.temperatura_gabinete) > 40
                        ? "var(--warn)"
                        : "var(--ok)"
                  }
                />
              </div>
            </div>

            </div>

            {/* Table */}
            <div className="pgp-card pgp-clickable" {...ir("/graficos", "Ver tendencias eléctricas")}>
              <div className="pgp-card-title">Últimas Mediciones</div>
              <div style={{ overflowX: "auto" }}>
                <table className="pgp-table">
                  <thead>
                    <tr>
                      <th>Fecha y hora</th>
                      <th>V L1</th>
                      <th>V L2</th>
                      <th>V L3</th>
                      <th>THD</th>
                      <th>Hz</th>
                      <th>FP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mediciones
                      .slice(-10)
                      .reverse()
                      .map((m, i) => {
                        const d = new Date(m.timestamp);
                        const ts = d.toLocaleDateString("es-CL", {
                          day: "2-digit",
                          month: "2-digit",
                        }) + " " + d.toLocaleTimeString("es-CL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                        return (
                          <tr key={i}>
                            <td style={{ fontSize: "12px", color: "var(--txt3)" }}>{ts}</td>
                            <td className="mono">{Number(m.voltaje_l1).toFixed(1)}</td>
                            <td className="mono">{Number(m.voltaje_l2).toFixed(1)}</td>
                            <td className="mono">{Number(m.voltaje_l3).toFixed(1)}</td>
                            <td className="mono" style={{ color: thdColor(m.thd) }}>{Number(m.thd).toFixed(1)}</td>
                            <td className="mono">{Number(m.frecuencia).toFixed(2)}</td>
                            <td className="mono" style={{ color: fpColor(m.factor_potencia) }}>{Number(m.factor_potencia).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              <p style={{ margin: "10px 0 0", fontSize: "12px", color: "var(--txt3)" }}>
                Valores en <span style={{ color: "var(--danger)", fontWeight: 700 }}>rojo</span>: fuera de límite ·{" "}
                <span style={{ color: "var(--warn)", fontWeight: 700 }}>ámbar</span>: cerca del límite ·{" "}
                <span style={{ color: "var(--ok)", fontWeight: 700 }}>verde</span>: dentro de rango
              </p>
            </div>
          </>
        ) : (
          <div className="pgp-card" style={{ textAlign: "center", color: "var(--txt3)", padding: "40px" }}>
            Selecciona un equipo para ver su monitoreo
          </div>
        )}
      </div>
    </Layout>
  );
}
