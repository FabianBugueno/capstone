import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Layout from "../components/Layout";
import { Dato, Encabezado, ParametrosInstalacion, SinDatos } from "../components/Monitoreo";
import useInstalacion from "../hooks/useInstalacion";
import useMedicionEnVivo from "../hooks/useMedicionEnVivo";
import { calcular, leer, tonoCaida, tonoDesbalance, tonoFp, tooltipStyle } from "../lib/calculos";

const COLORES_FASE = ["var(--phase-1)", "var(--phase-2)", "var(--phase-3)", "var(--txt3)"];

export default function ParametrosElectricos() {
  const { equipos, equipoId, setEquipoId, medicion, recibidas } = useMedicionEnVivo();
  const [inst, cambiar] = useInstalacion();
  const l = leer(medicion);
  const c = l && calcular(l, inst);

  return (
    <Layout>
      <div className="pgp-fade-in" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Encabezado
          titulo="Parámetros Eléctricos Trifasicos"
          sub="Potencias, corrientes, tensiones y línea de distribución"
          equipos={equipos}
          equipoId={equipoId}
          setEquipoId={setEquipoId}
          enVivo={recibidas > 0}
        />
        <ParametrosInstalacion inst={inst} cambiar={cambiar} campos={["l_km", "l_sec_mm2"]} />

        {!l || !c ? (
          <SinDatos />
        ) : (
          <>
            <div className="pgp-grid-3">
              <div className="pgp-card">
                <div className="pgp-card-title">Potencias del Sistema</div>
                <Dato label="P activa" valor={c.P.toFixed(2)} unidad="kW" />
                <Dato label="Q reactiva" valor={c.Q.toFixed(2)} unidad="kVAr" />
                <Dato label="S aparente" valor={c.S.toFixed(2)} unidad="kVA" />
                <Dato label="cos φ" valor={c.fp.toFixed(3)} tono={tonoFp(c.fp)} />
                <Dato label="I promedio" valor={c.I.toFixed(1)} unidad="A" />
              </div>
              <div className="pgp-card">
                <div className="pgp-card-title">Línea de Distribución</div>
                <Dato label="R línea" valor={c.R_lin.toFixed(4)} unidad="Ω" />
                <Dato label="X línea" valor={c.X_lin.toFixed(4)} unidad="Ω" />
                <Dato label="Z línea" valor={c.Z_lin.toFixed(4)} unidad="Ω" />
                <Dato label="Caída absoluta" valor={(c.U_drop * 1000).toFixed(2)} unidad="V" />
                <Dato label="Caída %" valor={c.U_drop_pct.toFixed(2)} unidad="%" tono={tonoCaida(c.U_drop_pct)} />
              </div>
              <div className="pgp-card">
                <div className="pgp-card-title">Balance de Tensiones</div>
                <Dato label="VA (L1-N)" valor={l.va.toFixed(1)} unidad="V" />
                <Dato label="VB (L2-N)" valor={l.vb.toFixed(1)} unidad="V" />
                <Dato label="VC (L3-N)" valor={l.vc.toFixed(1)} unidad="V" />
                <Dato label="V línea (L-L)" valor={c.V.toFixed(1)} unidad="V" />
                <Dato label="Desbalance" valor={c.desbalance.toFixed(2)} unidad="%" tono={tonoDesbalance(c.desbalance)} />
                <div className={`pgp-alert ${c.desbalance < 2 ? "pgp-alert-ok" : "pgp-alert-err"}`} style={{ margin: "8px 0 0" }}>
                  {c.desbalance < 2
                    ? "Dentro del límite IEC 61000-3-13 (2 %)"
                    : `Desbalance de ${c.desbalance.toFixed(2)} % supera el límite IEC 61000-3-13 de 2 %`}
                </div>
              </div>
            </div>

            <div className="pgp-card">
              <div className="pgp-card-title">Perfil de Corrientes por Fase</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={[
                    { fase: "Fase A", i: l.ia },
                    { fase: "Fase B", i: l.ib },
                    { fase: "Fase C", i: l.ic },
                    { fase: "Promedio", i: Number(c.I.toFixed(1)) },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="fase" stroke="var(--txt3)" fontSize={12} />
                  <YAxis stroke="var(--txt3)" fontSize={12} unit=" A" />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent-bg)" }} />
                  <Bar dataKey="i" name="Corriente (A)" animationDuration={300}>
                    {COLORES_FASE.map((color) => (
                      <Cell key={color} fill={color} fillOpacity={0.75} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
