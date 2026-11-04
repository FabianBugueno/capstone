import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import api from "../api/axios";
import Layout from "../components/Layout";
import useEnVivo from "../hooks/useEnVivo";

interface Incidencia {
  id: number;
  equipo_id: number;
  timestamp: string;
  tipo: string;
  nivel: string;
  estado: string;
  descripcion: string | null;
  valor_medido: number | null;
  umbral_config: number | null;
}

export default function Incidencias() {
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  // Permite abrir la pestaña ya filtrada, p. ej. /incidencias?estado=activa desde el panel principal
  const [params] = useSearchParams();
  const estadoInicial = params.get("estado") ?? "";
  const [filtroEstado, setFiltroEstado] = useState(
    ["activa", "reconocida", "resuelta"].includes(estadoInicial) ? estadoInicial : "todas",
  );
  const [loading, setLoading] = useState(false);

  const fetchIncidencias = (silencioso = false) => {
    if (!silencioso) setLoading(true);
    let url = "/incidencias/";
    if (filtroEstado !== "todas") {
      url += `?estado=${filtroEstado}`;
    }
    api
      .get(url)
      .then((res) => setIncidencias(res.data))
      .catch(() => setIncidencias([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchIncidencias();
  }, [filtroEstado]);

  useEnVivo({ incidencia: () => fetchIncidencias(true) });

  const porTipo = useMemo(() => {
    const acc: Record<string, { tipo: string; critico: number; advertencia: number }> = {};
    for (const inc of incidencias) {
      acc[inc.tipo] ??= { tipo: inc.tipo, critico: 0, advertencia: 0 };
      if (inc.nivel === "critico") acc[inc.tipo].critico++;
      else acc[inc.tipo].advertencia++;
    }
    return Object.values(acc);
  }, [incidencias]);

  const cambiarEstado = (id: number, nuevoEstado: string) => {
    api
      .put(`/incidencias/${id}`, { estado: nuevoEstado })
      .then(() => fetchIncidencias())
      .catch(() => alert("Error al actualizar"));
  };

  const formatFecha = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const nivelStyle = (nivel: string) => {
    if (nivel === "critico")
      return {
        background: "var(--danger-bg)",
        border: "1px solid color-mix(in srgb, var(--danger) 35%, var(--border))",
      };
    return {
      background: "var(--warn-bg)",
      border: "1px solid color-mix(in srgb, var(--warn) 35%, var(--border))",
    };
  };

  const estadoBadge = (estado: string) => {
    if (estado === "activa") return "pgp-badge pgp-badge-err";
    if (estado === "reconocida") return "pgp-badge pgp-badge-warn";
    return "pgp-badge pgp-badge-ok";
  };

  return (
    <Layout>
      <div
        className="pgp-fade-in"
        style={{ display: "flex", flexDirection: "column", gap: "12px" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <label htmlFor="filtro-estado" style={{ fontSize: "13px", fontWeight: 600, color: "var(--txt2)" }}>
            Estado
          </label>
          <select
            id="filtro-estado"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            style={{ padding: "5px 10px", background: "var(--bg-deep)", border: "1px solid var(--border)", borderRadius: "4px", color: "var(--txt1)", fontSize: "13px", cursor: "pointer", outline: "none" }}
          >
            <option value="todas" style={{ background: "var(--bg-deep)" }}>
              Todas
            </option>
            <option value="activa" style={{ background: "var(--bg-deep)" }}>
              Activas
            </option>
            <option value="reconocida" style={{ background: "var(--bg-deep)" }}>
              Reconocidas
            </option>
            <option value="resuelta" style={{ background: "var(--bg-deep)" }}>
              Resueltas
            </option>
          </select>
          <button onClick={() => fetchIncidencias()} style={{ padding: "5px 12px", background: "transparent", border: "1px solid var(--border2)", borderRadius: "4px", color: "var(--txt2)", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}>
            Actualizar
          </button>
          <span style={{ marginLeft: "auto", fontSize: "12px", color: "var(--txt3)" }}>
            {incidencias.length} resultado(s)
          </span>
        </div>

        {loading && (
          <div className="pgp-alert pgp-alert-info">
            Cargando incidencias...
          </div>
        )}

        {porTipo.length > 0 && (
          <div className="pgp-card">
            <div className="pgp-card-title">Incidencias por Tipo</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={porTipo}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="tipo" stroke="var(--txt3)" fontSize={12} />
                <YAxis stroke="var(--txt3)" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "var(--bg-card)",
  color: "var(--txt1)", border: "1px solid var(--border2)", borderRadius: "6px", fontSize: "13px" }} cursor={{ fill: "var(--accent-bg)" }} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="critico" name="Crítico" stackId="n" fill="var(--danger)" animationDuration={400} />
                <Bar dataKey="advertencia" name="Advertencia" stackId="n" fill="var(--warn)" animationDuration={400} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {incidencias.length === 0 && !loading ? (
          <div
            className="pgp-card"
            style={{
              textAlign: "center",
              color: "var(--txt3)",
              padding: "40px",
            }}
          >
            No hay incidencias registradas con este filtro
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {incidencias.map((inc) => (
              <div
                key={inc.id}
                className="pgp-card"
                style={{
                  ...nivelStyle(inc.nivel),
                  borderRadius: "6px",
                  padding: "10px 14px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span className={`pgp-dot ${inc.nivel === "critico" ? "pgp-dot-err" : "pgp-dot-warn"}`}></span>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--txt1)" }}>{inc.tipo}</span>
                      <span className={estadoBadge(inc.estado)}>{inc.estado.charAt(0).toUpperCase() + inc.estado.slice(1)}</span>
                      <span style={{ fontSize: "12px", color: "var(--txt3)" }}>Equipo #{inc.equipo_id}</span>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--txt2)", marginBottom: "4px", lineHeight: 1.4 }}>{inc.descripcion}</p>
                    <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "var(--txt3)" }}>
                      <span>Medido: <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--txt2)" }}>{inc.valor_medido !== null ? Number(inc.valor_medido).toFixed(2) : "-"}</span></span>
                      <span>Umbral: <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--txt2)" }}>{inc.umbral_config !== null ? Number(inc.umbral_config).toFixed(2) : "-"}</span></span>
                      <span>{formatFecha(inc.timestamp)}</span>
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", gap: "6px", marginLeft: "12px" }}
                  >
                    {inc.estado === "activa" && (
                      <button onClick={() => cambiarEstado(inc.id, "reconocida")} style={{ padding: "4px 10px", fontSize: "12px", background: "transparent", border: "1px solid var(--warn)", borderRadius: "3px", color: "var(--warn)", cursor: "pointer", fontWeight: 600 }}>
                        Reconocer
                      </button>
                    )}
                    {inc.estado !== "resuelta" && (
                      <button onClick={() => cambiarEstado(inc.id, "resuelta")} style={{ padding: "4px 10px", fontSize: "12px", background: "transparent", border: "1px solid var(--ok)", borderRadius: "3px", color: "var(--ok)", cursor: "pointer", fontWeight: 600 }}>
                        Resolver
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
