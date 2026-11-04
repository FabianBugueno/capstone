import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Layout from "../components/Layout";
import { Dato, Encabezado, ParametrosInstalacion, SinDatos } from "../components/Monitoreo";
import useInstalacion from "../hooks/useInstalacion";
import useMedicionEnVivo from "../hooks/useMedicionEnVivo";
import { calcular, leer, tooltipStyle } from "../lib/calculos";

export default function Cortocircuito() {
  const { equipos, equipoId, setEquipoId, medicion, recibidas } = useMedicionEnVivo();
  const [inst, cambiar] = useInstalacion();
  const l = leer(medicion);
  const c = l && calcular(l, inst);

  return (
    <Layout>
      <div className="pgp-fade-in" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Encabezado
          titulo="Cortocircuito y Protecciones"
          sub="IEC 60909 · NFPA 70E · curvas de protección"
          equipos={equipos}
          equipoId={equipoId}
          setEquipoId={setEquipoId}
          enVivo={recibidas > 0}
        />
        <ParametrosInstalacion inst={inst} cambiar={cambiar} campos={["s_tr_kva", "z_tr_pct", "l_km", "l_sec_mm2"]} />

        {!l || !c ? (
          <SinDatos />
        ) : (
          <>
            <div className="pgp-grid-3">
              <div className="pgp-card">
                <div className="pgp-card-title">Corrientes de Cortocircuito – IEC 60909</div>
                <Dato label="Z transformador" valor={c.Z_tr.toFixed(4)} unidad="Ω" />
                <Dato label="Z total" valor={c.Z_tot.toFixed(4)} unidad="Ω" />
                <Dato label="Icc en origen TR" valor={(c.Icc_ori / 1000).toFixed(2)} unidad="kA" tono="err" />
                <Dato label="Icc en tablero" valor={(c.Icc_tab / 1000).toFixed(2)} unidad="kA" tono="warn" />
              </div>
              <div className="pgp-card">
                <div className="pgp-card-title">Arco Eléctrico – NFPA 70E</div>
                <Dato label="Energía incidente est." valor={c.E_arc.toFixed(2)} unidad="cal/cm²" tono="warn" />
                <Dato label="Categoría PPE" valor={`AFIE ${c.afie}`} tono={c.afie >= 3 ? "err" : "warn"} texto />
                <Dato label="Distancia de trabajo" valor={c.Icc_tab > 10000 ? "≥ 1.8 m" : "≥ 0.9 m"} texto />
                <div className="pgp-alert pgp-alert-warn" style={{ margin: "8px 0 0" }}>
                  PPE mínimo: {c.afie >= 3 ? "traje de arco completo ≥ 40 cal/cm²" : "protección de arco básica"}
                </div>
              </div>
              <div className="pgp-card">
                <div className="pgp-card-title">Protecciones Recomendadas</div>
                <Dato label="Icc tablero" valor={(c.Icc_tab / 1000).toFixed(1)} unidad="kA" />
                <Dato label="Poder de corte mínimo" valor={(Math.ceil((c.Icc_tab / 1000) * 1.25 * 10) / 10).toFixed(1)} unidad="kA" tono="warn" />
                <Dato label="Relé de protección" valor="50/51 sobreintensidad" texto />
                <Dato label="Ajuste recomendado" valor={(c.I * 1.25).toFixed(0)} unidad="A" />
              </div>
            </div>

            <div className="pgp-card">
              <div className="pgp-card-title">Curvas de Protección – Tiempo vs. Corriente</div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={c.curvas}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="multiplo" stroke="var(--txt3)" fontSize={12} />
                  <YAxis scale="log" domain={[0.01, "auto"]} allowDataOverflow stroke="var(--txt3)" fontSize={12} unit=" s" />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${Number(v).toFixed(3)} s`} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Line type="monotone" dataKey="iec" name="Relé IEC inversa estándar" stroke="var(--accent)" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
                  <Line dataKey="instantaneo" name="Disparo instantáneo" stroke="var(--danger)" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
              <div className="pgp-alert pgp-alert-info" style={{ margin: "8px 0 0" }}>
                Modelo simplificado IEC 60909. No reemplaza un estudio de coordinación profesional.
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
