import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Layout from "../components/Layout";
import { Dato, Encabezado, SinDatos } from "../components/Monitoreo";
import useMedicionEnVivo from "../hooks/useMedicionEnVivo";
import { armonicos, leer, tonoThd, tooltipStyle } from "../lib/calculos";

const LIMITE_THD = 5; // IEC 61000 / IEEE 519 para THD de tension

const colorArmonico = (n: number, pct: number) =>
  n === 1 ? "var(--accent)" : pct > 5 ? "var(--danger)" : pct > 2.5 ? "var(--warn)" : "var(--ok)";

export default function Armonicos() {
  const { equipos, equipoId, setEquipoId, medicion, recibidas } = useMedicionEnVivo();
  const l = leer(medicion);
  const f0 = l && Number.isFinite(l.frecuencia) ? Math.round(l.frecuencia) : 50;
  const espectro = l ? armonicos(l.thd, f0) : [];
  const dominantes = espectro.slice(1).sort((a, b) => b.pct - a.pct).slice(0, 6);
  const thdPost = l ? l.thd * 0.35 : 0;

  return (
    <Layout>
      <div className="pgp-fade-in" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Encabezado
          titulo="Análisis Armónicos / THD"
          sub="Espectro armónico estimado hasta la 25ª a partir del THD medido"
          equipos={equipos}
          equipoId={equipoId}
          setEquipoId={setEquipoId}
          enVivo={recibidas > 0}
        />

        {!l ? (
          <SinDatos />
        ) : (
          <>
            <div className="pgp-grid-2">
              <div className="pgp-card">
                <div className="pgp-card-title">THD – Distorsión Armónica Total</div>
                <Dato label="THD medido" valor={l.thd.toFixed(1)} unidad="%" tono={tonoThd(l.thd)} />
                <Dato label="THD post-PGP (filtro activo DSP)" valor={thdPost.toFixed(1)} unidad="%" tono="ok" />
                <Dato label="Límite IEC 61000 / IEEE 519" valor={`≤ ${LIMITE_THD}`} unidad="%" />
                <div className={`pgp-alert ${l.thd <= LIMITE_THD ? "pgp-alert-ok" : "pgp-alert-err"}`} style={{ margin: "8px 0 0" }}>
                  {l.thd <= LIMITE_THD ? "En conformidad con IEEE 519" : "Incumplimiento IEEE 519 – Compensación activa requerida"}
                </div>
              </div>
              <div className="pgp-card">
                <div className="pgp-card-title">Componentes Armónicas Dominantes</div>
                {dominantes.map((h) => (
                  <Dato
                    key={h.n}
                    label={`${h.n}ª armónica (${h.freq} Hz)`}
                    valor={h.pct.toFixed(2)}
                    unidad="%"
                    tono={h.pct > 5 ? "err" : h.pct > 2.5 ? "warn" : "ok"}
                  />
                ))}
              </div>
            </div>

            <div className="pgp-card">
              <div className="pgp-card-title">Espectro Armónico (% de la fundamental)</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={espectro.map((h) => ({ ...h, etiqueta: h.n === 1 ? `F (${h.freq} Hz)` : `${h.n}ª` }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="etiqueta" stroke="var(--txt3)" fontSize={12} />
                  {/* Escala hasta 20 %: la fundamental (100 %) se recorta para que las armonicas sean legibles */}
                  <YAxis stroke="var(--txt3)" fontSize={12} unit="%" domain={[0, 20]} allowDataOverflow />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent-bg)" }} formatter={(v) => `${Number(v).toFixed(2)} %`} />
                  <ReferenceLine y={5} stroke="var(--danger)" strokeDasharray="4 3" label={{ value: "Límite individual 5%", fill: "var(--danger)", fontSize: 12, position: "right" }} />
                  <Bar dataKey="pct" name="% fundamental" animationDuration={300}>
                    {/* La fundamental se recorta en el eje de 20 %: su etiqueta dice el valor real */}
                    <LabelList dataKey="pct" position="insideBottom" offset={12} fontSize={13} fontWeight={700} fill="#fff" formatter={(v) => (Number(v) >= 100 ? "100 %" : "")} />
                    {espectro.map((h) => (
                      <Cell key={h.n} fill={colorArmonico(h.n, h.pct)} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="pgp-grid-2">
              <div className="pgp-card">
                <div className="pgp-card-title">Causas Raíz Probables</div>
                <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "13px", color: "var(--txt2)", lineHeight: 1.8 }}>
                  {l.thd > 8 && <li><strong>VFDs sin filtro</strong> – principal fuente de 5ª y 7ª armónica</li>}
                  {l.thd > 5 && <li><strong>Rectificadores de 6 pulsos</strong> – contribuyen a la 11ª y 13ª</li>}
                  <li><strong>UPS / balastos electrónicos</strong> – cargas no lineales, 3ª armónica</li>
                  {l.thd > 12 && <li style={{ color: "var(--danger)" }}><strong>Resonancia paralela</strong> – revisar banco de condensadores con urgencia</li>}
                </ul>
              </div>
              <div className="pgp-card">
                <div className="pgp-card-title">Plan de Mitigación</div>
                <ol style={{ margin: 0, paddingLeft: "16px", fontSize: "13px", color: "var(--txt2)", lineHeight: 1.8 }}>
                  <li>Instalar <strong>PowerGuardian Pro</strong> – filtro activo DSP</li>
                  <li>Filtros pasivos en entradas de VFD &gt; 75 kW</li>
                  <li>Revisión del banco de condensadores existente</li>
                  <li>Medición IEEE 519 post-instalación</li>
                </ol>
                <div className="pgp-alert pgp-alert-ok" style={{ margin: "8px 0 0" }}>
                  THD esperado post-PGP: {thdPost.toFixed(1)} %
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
