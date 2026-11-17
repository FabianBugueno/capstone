import { useEffect, useRef, useState, type ReactNode } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import api from "../api/axios";
import { fechaUTC } from "../lib/fecha";
import { LECTURAS, UMBRALES, num } from "../lib/medicion";

export interface Incidencia {
  id: number;
  equipo_id: number;
  timestamp: string;
  tipo: string;
  nivel: string;
  estado: string;
  descripcion: string | null;
  valor_medido: number | null;
  umbral_config: number | null;
  fecha_creacion: string;
  reconocida_por: string | null;
  reconocida_en: string | null;
  resuelta_por: string | null;
  resuelta_en: string | null;
  nota_resolucion: string | null;
}

interface Equipo {
  nombre: string;
  ubicacion: string | null;
  estado: string;
}

type Medicion = Record<string, number | string | null> & { timestamp: string };

const VENTANA_MIN = 5;

// Parametro de la medicion que dispara cada tipo de incidencia (ver detector_anomalias.py)
const SERIES: Record<string, { campos: string[]; unidad: string }> = {
  Sobrevoltaje: { campos: ["voltaje_l1", "voltaje_l2", "voltaje_l3"], unidad: "V" },
  "Bajo Voltaje": { campos: ["voltaje_l1", "voltaje_l2", "voltaje_l3"], unidad: "V" },
  Sobrecorriente: { campos: ["corriente_l1", "corriente_l2", "corriente_l3"], unidad: "A" },
  "THD Alto": { campos: ["thd"], unidad: "%" },
  "Bajo Factor Potencia": { campos: ["factor_potencia"], unidad: "" },
};

const COLORES = ["var(--phase-1)", "var(--phase-2)", "var(--phase-3)"];

const hora = (d: Date) => d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export default function DetalleIncidencia({ incidencia, onClose }: { incidencia: Incidencia; onClose: () => void }) {
  const [equipo, setEquipo] = useState<Equipo | null>(null);
  const [umbrales, setUmbrales] = useState<Record<string, number> | null>(null);
  const [mediciones, setMediciones] = useState<Medicion[]>([]);
  const [cargando, setCargando] = useState(true);
  const cerrarRef = useRef<HTMLButtonElement>(null);

  const instante = fechaUTC(incidencia.timestamp);

  useEffect(() => {
    const t = instante.getTime();
    const desde = new Date(t - VENTANA_MIN * 60_000).toISOString();
    const hasta = new Date(t + VENTANA_MIN * 60_000).toISOString();
    const id = incidencia.equipo_id;
    // Cada consulta es independiente: si una falla, el resto del detalle se muestra igual
    Promise.allSettled([
      api.get(`/equipos/${id}`).then((r) => setEquipo(r.data)),
      api.get(`/parametros/${id}`).then((r) => setUmbrales(r.data)),
      api.get("/mediciones/", { params: { equipo_id: id, desde, hasta } }).then((r) => setMediciones([...r.data].reverse())),
    ]).finally(() => setCargando(false));
  }, [incidencia.id]);

  useEffect(() => {
    cerrarRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Medicion mas cercana al instante de la incidencia
  const medicion = mediciones.reduce<Medicion | null>((mejor, m) => {
    const dif = Math.abs(new Date(m.timestamp).getTime() - instante.getTime());
    return !mejor || dif < Math.abs(new Date(mejor.timestamp).getTime() - instante.getTime()) ? m : mejor;
  }, null);

  const serie = SERIES[incidencia.tipo];
  const critico = incidencia.nivel === "critico";
  const acento = critico ? "var(--danger-soft)" : "var(--warn-soft)";

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(10, 16, 24, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", zIndex: 1000 }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="detalle-incidencia-titulo"
        onClick={(e) => e.stopPropagation()}
        className="pgp-card pgp-fade-in"
        style={{ width: "min(760px, 100%)", maxHeight: "90vh", overflowY: "auto", borderTop: `4px solid ${acento}`, display: "flex", flexDirection: "column", gap: "16px" }}
      >
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
          <div>
            <h2 id="detalle-incidencia-titulo" style={{ fontSize: "18px", fontWeight: 700, color: "var(--txt1)", margin: 0 }}>
              {incidencia.tipo}
            </h2>
            <p style={{ fontSize: "12px", color: "var(--txt3)", margin: "4px 0 0" }}>
              Incidencia #{incidencia.id} · {critico ? "Crítico" : "Advertencia"} · {incidencia.estado.charAt(0).toUpperCase() + incidencia.estado.slice(1)} ·{" "}
              {instante.toLocaleString("es-CL")}
            </p>
          </div>
          <button
            ref={cerrarRef}
            onClick={onClose}
            aria-label="Cerrar detalles"
            style={{ padding: "4px 10px", background: "transparent", border: "1px solid var(--border2)", borderRadius: "4px", color: "var(--txt2)", fontSize: "13px", cursor: "pointer", fontWeight: 600 }}
          >
            Cerrar
          </button>
        </header>

        {incidencia.descripcion && <p style={{ fontSize: "13px", color: "var(--txt2)", margin: 0 }}>{incidencia.descripcion}</p>}

        <Seccion titulo="Historial">
          <Fila etiqueta="Detectada" valor={instante.toLocaleString("es-CL")} />
          <Fila
            etiqueta="Reconocida"
            valor={incidencia.reconocida_en ? `${incidencia.reconocida_por ?? "–"} · ${fechaUTC(incidencia.reconocida_en).toLocaleString("es-CL")}` : "Pendiente"}
          />
          <Fila
            etiqueta="Resuelta"
            valor={incidencia.resuelta_en ? `${incidencia.resuelta_por ?? "–"} · ${fechaUTC(incidencia.resuelta_en).toLocaleString("es-CL")}` : "Pendiente"}
          />
          {incidencia.nota_resolucion && <Fila etiqueta="Nota" valor={incidencia.nota_resolucion} />}
        </Seccion>

        <Seccion titulo="Equipo">
          {equipo ? (
            <>
              <Fila etiqueta="Nombre" valor={equipo.nombre} />
              <Fila etiqueta="Ubicación" valor={equipo.ubicacion?.trim() || "Sin ubicación definida"} />
              <Fila etiqueta="Estado" valor={equipo.estado} />
            </>
          ) : (
            <Vacio texto={cargando ? "Cargando..." : `Equipo #${incidencia.equipo_id}`} />
          )}
        </Seccion>

        <Seccion titulo={`Evolución ±${VENTANA_MIN} min`}>
          {serie && mediciones.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={mediciones}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="timestamp" tickFormatter={(t) => hora(new Date(t))} stroke="var(--txt3)" fontSize={11} minTickGap={40} />
                <YAxis stroke="var(--txt3)" fontSize={11} domain={["auto", "auto"]} unit={serie.unidad ? ` ${serie.unidad}` : ""} width={60} />
                <Tooltip
                  labelFormatter={(t) => hora(new Date(String(t)))}
                  formatter={(v) => num(v, serie.unidad)}
                  contentStyle={{ backgroundColor: "var(--bg-card)", color: "var(--txt1)", border: "1px solid var(--border2)", borderRadius: "6px", fontSize: "12px" }}
                />
                {incidencia.umbral_config !== null && (
                  <ReferenceLine y={Number(incidencia.umbral_config)} stroke={acento} strokeDasharray="4 3" label={{ value: "Umbral", fill: "var(--txt2)", fontSize: 11, position: "insideTopRight" }} />
                )}
                {medicion && <ReferenceLine x={medicion.timestamp} stroke="var(--txt3)" strokeDasharray="2 2" />}
                {serie.campos.map((c, i) => (
                  <Line key={c} type="monotone" dataKey={c} name={c.replace("voltaje_", "V ").replace("corriente_", "I ").toUpperCase()} stroke={COLORES[i]} dot={false} strokeWidth={2} isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Vacio texto={cargando ? "Cargando..." : "No hay mediciones de ese periodo (se conservan 7 días)"} />
          )}
        </Seccion>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
          <Seccion titulo="Medición en el momento de la incidencia">
            {medicion ? (
              LECTURAS.map(([k, etiqueta, u]) => <Fila key={k} etiqueta={etiqueta} valor={num(medicion[k], u)} />)
            ) : (
              <Vacio texto={cargando ? "Cargando..." : "Medición no disponible"} />
            )}
          </Seccion>
          <Seccion titulo="Umbrales configurados">
            {umbrales ? (
              UMBRALES.map(([k, etiqueta, u]) => <Fila key={k} etiqueta={etiqueta} valor={num(umbrales[k], u)} />)
            ) : (
              <Vacio texto={cargando ? "Cargando..." : "Sin umbrales configurados"} />
            )}
          </Seccion>
        </div>
      </div>
    </div>
  );
}

export function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section style={{ background: "var(--bg-card2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px 14px" }}>
      <h3 style={{ fontSize: "13px", fontWeight: 700, color: "var(--txt1)", margin: "0 0 8px" }}>{titulo}</h3>
      {children}
    </section>
  );
}

export function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "12px", padding: "3px 0" }}>
      <span style={{ color: "var(--txt3)" }}>{etiqueta}</span>
      <span style={{ color: "var(--txt1)", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{valor}</span>
    </div>
  );
}

export function Vacio({ texto }: { texto: string }) {
  return <p style={{ fontSize: "12px", color: "var(--txt3)", margin: 0 }}>{texto}</p>;
}
