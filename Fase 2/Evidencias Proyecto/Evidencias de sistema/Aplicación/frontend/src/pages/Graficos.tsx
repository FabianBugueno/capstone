import { useEffect, useState } from "react";
import {
  ReferenceArea,
  ReferenceLine,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import api from "../api/axios";
import Layout from "../components/Layout";
import useEnVivo from "../hooks/useEnVivo";
import useMedicionEnVivo from "../hooks/useMedicionEnVivo";
import { Encabezado } from "../components/Monitoreo";

// Ventana movil: ultimos N puntos, asi el grafico se desplaza con cada medicion nueva
const VENTANA = 60;

interface Medicion {
  timestamp: string;
  voltaje_l1: number;
  voltaje_l2: number;
  voltaje_l3: number;
  thd: number;
  frecuencia: number;
  factor_potencia: number;
}

export default function Graficos() {
  const [mediciones, setMediciones] = useState<Medicion[]>([]);
  const { equipos, equipoId, setEquipoId, recibidas } = useMedicionEnVivo();
  const [loading, setLoading] = useState(false);

  const fetchMediciones = () => {
    if (!equipoId) return;
    setLoading(true);
    api
      .get(`/mediciones/?equipo_id=${equipoId}`)
      .then((res) => setMediciones(res.data.slice(0, VENTANA).reverse()))
      .catch(() => setMediciones([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMediciones();
  }, [equipoId]);

  useEnVivo({
    medicion: (m) => {
      if (m.equipo_id === equipoId) setMediciones((p) => [...p, m as unknown as Medicion].slice(-VENTANA));
    },
  });

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const day = String(d.getDate()).padStart(2, "0");
    const mon = String(d.getMonth() + 1).padStart(2, "0");
    const hr = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${mon} ${hr}:${min}`;
  };

  const chartTooltipStyle = {
    backgroundColor: "var(--bg-card)",
  color: "var(--txt1)",
    border: "1px solid var(--border2)",
    borderRadius: "6px",
    fontSize: "13px",
  };

  return (
    <Layout>
      <div className="pgp-fade-in" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <Encabezado equipos={equipos} equipoId={equipoId} setEquipoId={setEquipoId} enVivo={recibidas > 0} />
          <button
            onClick={() => fetchMediciones()}
            style={{ marginLeft: "auto", padding: "7px 14px", background: "var(--bg-card)", border: "1px solid var(--border2)", borderRadius: "6px", color: "var(--txt1)", fontSize: "13px", cursor: "pointer", fontWeight: 600 }}
          >
            Recargar historial
          </button>
        </div>

        {loading && <div className="pgp-alert pgp-alert-info">Cargando datos...</div>}

        {mediciones.length === 0 && !loading ? (
          <div className="pgp-card" style={{ textAlign: "center", color: "var(--txt3)", padding: "40px" }}>
            Sin mediciones para este equipo
          </div>
        ) : (
          <>
            {/* Voltajes */}
            <div className="pgp-card">
              <div className="pgp-card-title">Voltajes (V) – Trifásico</div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={mediciones} margin={{ top: 8, right: 84, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="timestamp" tickFormatter={formatTime} stroke="var(--txt3)" fontSize={12} />
                  <YAxis stroke="var(--txt3)" fontSize={12} domain={[180, 270]} allowDataOverflow ticks={[180, 195, 210, 225, 240, 255, 270]} />
                  <ReferenceArea y1={210} y2={240} fill="var(--ok)" fillOpacity={0.06} />
                  <ReferenceLine y={210} stroke="var(--txt3)" strokeDasharray="4 3" label={{ value: "Mín 210 V", fill: "var(--txt2)", fontSize: 11, position: "right" }} />
                  <ReferenceLine y={240} stroke="var(--txt3)" strokeDasharray="4 3" label={{ value: "Máx 240 V", fill: "var(--txt2)", fontSize: 11, position: "right" }} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Line type="monotone" dataKey="voltaje_l1" stroke="var(--phase-1)" name="L1" dot={false} strokeWidth={2} isAnimationActive={false} />
                  <Line type="monotone" dataKey="voltaje_l2" stroke="var(--phase-2)" name="L2" dot={false} strokeWidth={2} isAnimationActive={false} />
                  <Line type="monotone" dataKey="voltaje_l3" stroke="var(--phase-3)" name="L3" dot={false} strokeWidth={2} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* THD */}
            <div className="pgp-card">
              <div className="pgp-card-title">THD – Distorsión Armónica (%)</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={mediciones} margin={{ top: 8, right: 84, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="timestamp" tickFormatter={formatTime} stroke="var(--txt3)" fontSize={12} />
                  <YAxis stroke="var(--txt3)" fontSize={12} domain={[0, 20]} allowDataOverflow />
                  <ReferenceLine y={5} stroke="var(--danger)" strokeDasharray="4 3" label={{ value: "Lím. 5 %", fill: "var(--danger)", fontSize: 11, position: "right" }} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Line type="monotone" dataKey="thd" stroke="var(--accent)" name="THD" dot={false} strokeWidth={2} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="pgp-grid-2">
              {/* Frecuencia */}
              <div className="pgp-card">
                <div className="pgp-card-title">Frecuencia (Hz)</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={mediciones} margin={{ top: 8, right: 84, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="timestamp" tickFormatter={formatTime} stroke="var(--txt3)" fontSize={12} />
                    <YAxis stroke="var(--txt3)" fontSize={12} domain={[49.5, 50.5]} allowDataOverflow />
                    <ReferenceLine y={50} stroke="var(--txt3)" strokeDasharray="4 3" label={{ value: "50 Hz", fill: "var(--txt2)", fontSize: 11, position: "right" }} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Line type="monotone" dataKey="frecuencia" stroke="var(--phase-2)" name="Frecuencia" dot={false} strokeWidth={2} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Factor de Potencia */}
              <div className="pgp-card">
                <div className="pgp-card-title">Factor de Potencia</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={mediciones} margin={{ top: 8, right: 84, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="timestamp" tickFormatter={formatTime} stroke="var(--txt3)" fontSize={12} />
                    <YAxis stroke="var(--txt3)" fontSize={12} domain={[0.5, 1.0]} allowDataOverflow />
                    <ReferenceLine y={0.9} stroke="var(--danger)" strokeDasharray="4 3" label={{ value: "Mín 0,9", fill: "var(--danger)", fontSize: 11, position: "right" }} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Line type="monotone" dataKey="factor_potencia" stroke="var(--accent3)" name="FP" dot={false} strokeWidth={2} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
