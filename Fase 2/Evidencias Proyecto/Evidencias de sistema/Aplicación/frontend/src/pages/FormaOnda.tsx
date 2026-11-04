import { useEffect, useRef, useState } from "react";
import api from "../api/axios";
import Layout from "../components/Layout";
import { Dato, Encabezado } from "../components/Monitoreo";
import useMedicionEnVivo from "../hooks/useMedicionEnVivo";
import { tonoThd } from "../lib/calculos";

const ESCENARIOS: [string, string][] = [
  ["mixto", "Mixto (ponderado)"],
  ["normal", "Normal"],
  ["thd_alto", "THD Alto"],
  ["fp_bajo", "FP Bajo"],
  ["sobrecarga", "Sobrecarga"],
  ["sobrevoltaje", "Sobrevoltaje"],
  ["bajo_voltaje", "Bajo Voltaje"],
  ["desbalance", "Desbalance"],
  ["falla_critica", "Falla Critica"],
];

// Colores de fase del tema (--phase-1..3); se leen en cada cuadro para seguir el modo claro/oscuro
const FASES = [
  { key: "voltaje_l1", nombre: "L1", color: "--phase-1", offset: 0 },
  { key: "voltaje_l2", nombre: "L2", color: "--phase-2", offset: 2.094 },
  { key: "voltaje_l3", nombre: "L3", color: "--phase-3", offset: 4.189 },
] as const;

const ALTO_ONDA = 220;

// El simulador corre dentro del backend y arranca con el (app/services/en_vivo.py)
interface EstadoSim {
  activo: boolean;
  escenario: string;
  intervalo_seg: number;
  ultimo_error: string | null;
}

// El backend serializa los Decimal como string
type Medicion = Record<string, string | number | null>;

const num = (v: string | number | null | undefined) => (v == null ? null : Number(v));

const vColor = (v: number | null) =>
  v == null ? "var(--txt3)" : v > 240 || v < 210 ? "var(--danger)" : v > 235 || v < 215 ? "var(--warn)" : "var(--txt1)";
const thdColor = (v: number | null) => (v == null ? "var(--txt3)" : v > 5 ? "var(--danger)" : "var(--ok)");

// El aviso de estado ocupa siempre su propia linea de alto fijo: aparecer o cambiar no mueve la pagina
function EstadoKpi({ estado, textos }: { estado: "ok" | "warn" | "err" | null; textos: [string, string, string] }) {
  if (estado == null) return <div className="pgp-kpi-estado" />;
  const i = estado === "ok" ? 0 : estado === "warn" ? 1 : 2;
  return (
    <div className="pgp-kpi-estado">
      <span className={`pgp-badge pgp-badge-${estado}`}>{textos[i]}</span>
    </div>
  );
}

function Osciloscopio({ medicion }: { medicion: Medicion | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const datos = useRef(medicion);
  useEffect(() => {
    datos.current = medicion;
  });

  useEffect(() => {
    let frame = 0;
    let fase = 0;
    const dibujar = () => {
      const c = canvasRef.current;
      const ctx = c?.getContext("2d");
      if (!c || !ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const w = c.offsetWidth;
      const h = ALTO_ONDA;
      if (c.width !== Math.round(w * dpr)) c.width = Math.round(w * dpr);
      if (c.height !== Math.round(h * dpr)) c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const css = getComputedStyle(document.documentElement);
      const color = (v: string) => css.getPropertyValue(v).trim();

      ctx.fillStyle = color("--wave-bg");
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = color("--wave-grid");
      ctx.lineWidth = 1;
      for (let y = 0; y < h; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      for (let x = 0; x < w; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      ctx.strokeStyle = color("--wave-axis");
      ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();

      const d = datos.current;
      const thd = num(d?.thd) ?? 3;
      const amp = h * 0.35;
      for (const p of FASES) {
        const escala = (num(d?.[p.key]) ?? 220) / 220;
        ctx.beginPath();
        ctx.strokeStyle = color(p.color);
        ctx.lineWidth = 2;
        for (let x = 0; x < w; x++) {
          const t = (x / w) * Math.PI * 4 + fase + p.offset;
          let y = Math.sin(t) * amp * escala;
          // Distorsion armonica (3a y 5a) proporcional al THD medido
          if (thd > 3) {
            y += Math.sin(t * 3) * amp * (thd / 100) * 0.5;
            y += Math.sin(t * 5) * amp * (thd / 150) * 0.3;
          }
          if (x === 0) ctx.moveTo(x, h / 2 + y);
          else ctx.lineTo(x, h / 2 + y);
        }
        ctx.stroke();
      }
      fase += 0.04;
      frame = requestAnimationFrame(dibujar);
    };
    dibujar();
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Forma de onda trifásica en vivo, fases L1, L2 y L3"
        style={{ width: "100%", height: `${ALTO_ONDA}px`, display: "block", borderRadius: "6px", border: "1px solid var(--border)" }}
      />
      <div style={{ display: "flex", gap: "18px", marginTop: "10px", fontSize: "13px", color: "var(--txt2)" }}>
        {FASES.map((p) => (
          <span key={p.key} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "18px", height: "3px", borderRadius: "2px", background: `var(${p.color})` }} />
            Fase {p.nombre}
          </span>
        ))}
      </div>
    </>
  );
}

export default function FormaOnda() {
  const { equipos, equipoId, setEquipoId, medicion, recibidas } = useMedicionEnVivo();
  const [estadoSim, setEstadoSim] = useState<EstadoSim | null>(null);
  const [error, setError] = useState("");

  const fetchEstado = () =>
    api
      .get("/simulador/estado")
      .then((res) => setEstadoSim(res.data))
      .catch(() => setError("No se pudo leer el estado del simulador"));

  useEffect(() => {
    fetchEstado();
  }, []);

  const cambiarEscenario = (nuevo: string) => {
    api
      .post(`/simulador/escenario/${nuevo}`)
      .then(() => {
        setError("");
        fetchEstado();
      })
      .catch(() => setError("No se pudo cambiar el escenario"));
  };

  const activo = !!estadoSim?.activo;
  const v1 = num(medicion?.voltaje_l1);
  const v2 = num(medicion?.voltaje_l2);
  const v3 = num(medicion?.voltaje_l3);
  const thd = num(medicion?.thd);
  const freq = num(medicion?.frecuencia);

  const campo = { padding: "5px 8px", background: "var(--bg-deep)", border: "1px solid var(--border)", borderRadius: "4px", color: "var(--txt1)", fontSize: "13px", outline: "none" };

  return (
    <Layout>
      <div className="pgp-fade-in" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Encabezado
          titulo="Forma de Onda Trifásica"
          sub="Osciloscopio en vivo con contenido armónico superpuesto"
          equipos={equipos}
          equipoId={equipoId}
          setEquipoId={setEquipoId}
          enVivo={recibidas > 0}
        />

        {error && <div className="pgp-alert pgp-alert-err">{error}</div>}
        {estadoSim?.ultimo_error && <div className="pgp-alert pgp-alert-err">{estadoSim.ultimo_error}</div>}
        {estadoSim && !activo && (
          <div className="pgp-alert pgp-alert-warn">
            El simulador esta desactivado (SIMULADOR_ACTIVO=false en backend/.env).
          </div>
        )}

        {/* Simulador integrado */}
        <div className="pgp-card" style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", padding: "10px 14px" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent)" }}>
            Simulador
          </span>
          <span className={`pgp-badge ${activo ? "pgp-badge-ok" : "pgp-badge-info"}`}>{activo ? "Activo" : "Desactivado"}</span>
          <label style={{ fontSize: "12px", color: "var(--txt2)", display: "flex", alignItems: "center", gap: "6px" }}>
            Escenario
            <select value={estadoSim?.escenario ?? "mixto"} onChange={(e) => cambiarEscenario(e.target.value)} disabled={!activo} style={{ ...campo, cursor: "pointer" }}>
              {ESCENARIOS.map(([valor, nombre]) => (
                <option key={valor} value={valor} style={{ background: "var(--bg-deep)" }}>
                  {nombre}
                </option>
              ))}
            </select>
          </label>
          {estadoSim && (
            <span style={{ fontSize: "12px", color: "var(--txt3)", marginLeft: "auto" }}>
              Una medición por equipo activo cada {estadoSim.intervalo_seg} s · {recibidas} recibidas
            </span>
          )}
        </div>

        {/* KPIs */}
        <div className="pgp-kpi-row">
          {([["Voltaje L1", v1], ["Voltaje L2", v2], ["Voltaje L3", v3]] as const).map(([label, v]) => (
            <div key={label} className="pgp-kpi">
              <div className="pgp-kpi-val" style={{ color: vColor(v), transition: "color 0.3s" }}>{v ?? "--"}</div>
              <div className="pgp-kpi-label">
                {label} <span className="pgp-kpi-unit">V</span>
              </div>
              <EstadoKpi
                estado={v == null ? null : v > 240 || v < 210 ? "err" : v > 235 || v < 215 ? "warn" : "ok"}
                textos={["En rango", "Atención", "Fuera de rango"]}
              />
            </div>
          ))}
          <div className="pgp-kpi">
            <div className="pgp-kpi-val" style={{ color: thdColor(thd), transition: "color 0.3s" }}>{thd ?? "--"}</div>
            <div className="pgp-kpi-label">
              THD <span className="pgp-kpi-unit">%</span>
            </div>
            <EstadoKpi estado={thd == null ? null : thd > 5 ? "err" : "ok"} textos={["Dentro de límite", "", "Sobre 5 %"]} />
          </div>
        </div>

        <div className="pgp-card">
          <div className="pgp-card-title">Osciloscopio Trifásico</div>
          <Osciloscopio medicion={medicion} />
        </div>

        {v1 != null && thd != null && (
          <div className="pgp-grid-2">
            <div className="pgp-card">
              <div className="pgp-card-title">Parámetros de Onda</div>
              <Dato label="V pico (fase A)" valor={(v1 * Math.SQRT2).toFixed(1)} unidad="V" />
              <Dato label="Frecuencia fundamental" valor={freq ?? "--"} unidad="Hz" />
              <Dato label="THD" valor={thd.toFixed(1)} unidad="%" tono={tonoThd(thd)} />
              <Dato label="Forma de onda" valor={thd > 5 ? "Distorsionada" : "Cuasi-sinusoidal"} tono={thd > 5 ? "warn" : "ok"} texto />
            </div>
            <div className="pgp-card">
              <div className="pgp-card-title">Efecto Armónico en la Onda</div>
              <Dato label="Distorsión visible" valor={thd > 8 ? "Alta" : thd > 5 ? "Moderada" : "Baja"} tono={tonoThd(thd)} texto />
              <Dato label="Pérdidas adicionales est." valor={(thd * 0.05).toFixed(2)} unidad="%" tono={thd > 5 ? "warn" : "ok"} />
              <Dato label="Impacto transformador (K-factor)" valor={(1 + 0.01 * thd ** 1.8).toFixed(2)} tono={thd > 8 ? "err" : thd > 5 ? "warn" : "ok"} />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
