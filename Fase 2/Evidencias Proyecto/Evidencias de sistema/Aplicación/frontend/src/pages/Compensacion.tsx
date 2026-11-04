import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Layout from "../components/Layout";
import { Dato, Encabezado, ParametrosInstalacion, SinDatos } from "../components/Monitoreo";
import useInstalacion from "../hooks/useInstalacion";
import useMedicionEnVivo from "../hooks/useMedicionEnVivo";
import { calcular, leer, tonoFp, tooltipStyle } from "../lib/calculos";

export default function Compensacion() {
  const { equipos, equipoId, setEquipoId, medicion, recibidas } = useMedicionEnVivo();
  const [inst, cambiar] = useInstalacion();
  const l = leer(medicion);
  const c = l && calcular(l, inst);

  return (
    <Layout>
      <div className="pgp-fade-in" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Encabezado
          titulo="Compensación Reactiva Activa"
          sub="Algoritmo DSP de filtrado dinámico – corrección del factor de potencia"
          equipos={equipos}
          equipoId={equipoId}
          setEquipoId={setEquipoId}
          enVivo={recibidas > 0}
        />
        <ParametrosInstalacion inst={inst} cambiar={cambiar} campos={["fp_objetivo"]} />

        {!l || !c ? (
          <SinDatos />
        ) : (
          <>
            <div className="pgp-grid-2">
              <div className="pgp-card">
                <div className="pgp-card-title">Compensación Activa – Algoritmo DSP</div>
                <Dato label="Qc necesario" valor={c.Qc.toFixed(2)} unidad="kVAr" />
                <Dato label="FP inicial" valor={c.fp.toFixed(3)} tono={tonoFp(c.fp)} />
                <Dato label="FP objetivo" valor={inst.fp_objetivo.toFixed(3)} />
                <Dato label="Algoritmo DSP" valor="Activo – tiempo real" tono="ok" texto />
                <Dato label="Tiempo de respuesta" valor="< 1 ciclo (20 ms)" tono="ok" texto />
              </div>
              <div className="pgp-card">
                <div className="pgp-card-title">Resultado Post-Compensación</div>
                <Dato label="FP final" valor={c.fp_fin.toFixed(3)} tono={tonoFp(c.fp_fin)} />
                <Dato label="Q residual" valor={c.Q_fin.toFixed(2)} unidad="kVAr" />
                <Dato label="S final" valor={c.S_fin.toFixed(2)} unidad="kVA" />
                <Dato label="Reducción de corriente" valor={c.redI_pct.toFixed(1)} unidad="%" tono="ok" />
                <Dato label="Reducción de pérdidas" valor={c.redPerd_pct.toFixed(1)} unidad="%" tono="ok" />
                <div className={`pgp-alert ${c.fp_fin >= 0.95 ? "pgp-alert-ok" : "pgp-alert-warn"}`} style={{ margin: "8px 0 0" }}>
                  {c.fp_fin >= 0.95 ? "Sin penalizacion por factor de potencia" : "Penalizacion parcial residual"}
                </div>
              </div>
            </div>

            <div className="pgp-card">
              <div className="pgp-card-title">Triángulo de Potencias – Antes y Después de PGP</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={[
                    { magnitud: "P (kW)", antes: c.P, despues: c.P },
                    { magnitud: "Q (kVAr)", antes: c.Q, despues: c.Q_fin },
                    { magnitud: "S (kVA)", antes: c.S, despues: c.S_fin },
                    { magnitud: "FP (×100)", antes: c.fp * 100, despues: c.fp_fin * 100 },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="magnitud" stroke="var(--txt3)" fontSize={12} />
                  <YAxis stroke="var(--txt3)" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent-bg)" }} formatter={(v) => Number(v).toFixed(1)} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="antes" name="Antes PGP" fill="var(--danger)" fillOpacity={0.6} animationDuration={300} />
                  <Bar dataKey="despues" name="Post-PGP" fill="var(--ok)" fillOpacity={0.6} animationDuration={300} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
