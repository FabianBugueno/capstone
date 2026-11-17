import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import api from "../api/axios";
import { descargarReporte } from "../api/ml";
import type { FormatoReporte } from "../api/ml";
import Layout from "../components/Layout";
import DetalleIncidencia, { type Incidencia } from "../components/DetalleIncidencia";
import { fechaUTC } from "../lib/fecha";
import useEnVivo from "../hooks/useEnVivo";
import useMedicionEnVivo from "../hooks/useMedicionEnVivo";

const POR_PAGINA = 20;

type Estado = "activa" | "reconocida" | "resuelta";
type Nivel = "critico" | "advertencia";
type Destino = "reconocida" | "resuelta";

const PESTANAS: { id: string; etiqueta: string; estados: Estado[] }[] = [
  { id: "pendientes", etiqueta: "Pendientes", estados: ["activa", "reconocida"] },
  { id: "sin_reconocer", etiqueta: "Sin reconocer", estados: ["activa"] },
  { id: "reconocidas", etiqueta: "Reconocidas", estados: ["reconocida"] },
  { id: "resueltas", etiqueta: "Resueltas", estados: ["resuelta"] },
  { id: "todas", etiqueta: "Todas", estados: [] },
];

const NIVELES: { id: Nivel; etiqueta: string; color: string }[] = [
  { id: "critico", etiqueta: "Crítico", color: "var(--danger-soft)" },
  { id: "advertencia", etiqueta: "Advertencia", color: "var(--warn-soft)" },
];

// Enlaces del panel principal: /incidencias?estado=activa abre "Sin reconocer"
const PESTANA_POR_ESTADO: Record<string, string> = { activa: "sin_reconocer", reconocida: "reconocidas", resuelta: "resueltas" };

interface FilaResumen {
  estado: Estado;
  nivel: Nivel;
  tipo: string;
  total: number;
}

// Acciones sobre ids concretos o sobre todo el filtro actual
type Objetivo = { ids: number[] } | { filtro: true };

interface Pedido {
  destino: Destino;
  objetivo: Objetivo;
  cantidad: number;
}

const contar = (filas: FilaResumen[], estados: Estado[], niveles: Nivel[]) =>
  filas
    .filter((f) => (!estados.length || estados.includes(f.estado)) && (!niveles.length || niveles.includes(f.nivel)))
    .reduce((s, f) => s + f.total, 0);

const formatFecha = (ts: string) =>
  fechaUTC(ts).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const boton = (color: string, deshabilitado = false) => ({
  padding: "4px 10px",
  fontSize: "12px",
  background: "transparent",
  border: `1px solid ${color}`,
  borderRadius: "4px",
  color,
  fontWeight: 600,
  cursor: deshabilitado ? "default" : "pointer",
  opacity: deshabilitado ? 0.45 : 1,
});

const chip = (activo: boolean) => ({
  padding: "5px 12px",
  fontSize: "12px",
  fontWeight: 600,
  borderRadius: "999px",
  cursor: "pointer",
  border: `1px solid ${activo ? "var(--accent)" : "var(--border2)"}`,
  background: activo ? "var(--accent-bg)" : "transparent",
  color: activo ? "var(--accent)" : "var(--txt2)",
  fontVariantNumeric: "tabular-nums" as const,
});

const estadoBadge = (estado: string) => {
  if (estado === "activa") return "pgp-badge pgp-badge-err";
  if (estado === "reconocida") return "pgp-badge pgp-badge-warn";
  return "pgp-badge pgp-badge-ok";
};

export default function Incidencias() {
  const [params] = useSearchParams();
  const [pestana, setPestana] = useState(PESTANA_POR_ESTADO[params.get("estado") ?? ""] ?? "pendientes");
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [pagina, setPagina] = useState(1);
  const [items, setItems] = useState<Incidencia[]>([]);
  const [total, setTotal] = useState(0);
  const [resumen, setResumen] = useState<FilaResumen[]>([]);
  const [loading, setLoading] = useState(false);
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
  const [todoElFiltro, setTodoElFiltro] = useState(false);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [detalle, setDetalle] = useState<Incidencia | null>(null);
  // estable: el modal registra Escape con esta funcion y no debe re-suscribirse en cada actualizacion en vivo
  const cerrarDetalle = useCallback(() => setDetalle(null), []);
  const cerrarPedido = useCallback(() => setPedido(null), []);
  // Equipo activo compartido: los reportes se generan sobre el equipo seleccionado
  const { equipos, equipoId } = useMedicionEnVivo();
  // null = todos los equipos
  const [equipoFiltro, setEquipoFiltro] = useState<number | null>(null);
  // Con un equipo filtrado, el reporte es de ese equipo; si no, del equipo activo compartido
  const equipoReporte = equipoFiltro ?? equipoId;
  const [descargando, setDescargando] = useState<FormatoReporte | null>(null);

  const descargar = async (formato: FormatoReporte) => {
    if (!equipoReporte || descargando) return;
    setDescargando(formato);
    try {
      await descargarReporte(equipoReporte, formato);
    } catch {
      setAviso({ ok: false, texto: "No se pudo descargar el reporte. Intenta nuevamente." });
    } finally {
      setDescargando(null);
    }
  };

  const estados = PESTANAS.find((p) => p.id === pestana)!.estados;

  const cargar = (silencioso = false) => {
    if (!silencioso) setLoading(true);
    const filtro = { equipo_id: equipoFiltro ?? undefined, estado: estados.length ? estados : undefined, nivel: niveles.length ? niveles : undefined };
    Promise.all([
      api.get("/incidencias/resumen", { params: { equipo_id: equipoFiltro ?? undefined } }),
      api.get("/incidencias/", {
        params: { ...filtro, limite: POR_PAGINA, offset: (pagina - 1) * POR_PAGINA },
        paramsSerializer: { indexes: null }, // estado=a&estado=b, como lo espera FastAPI
      }),
    ])
      .then(([r, lista]) => {
        const n = Number(lista.headers["x-total-count"] ?? lista.data.length);
        setResumen(r.data);
        setTotal(n);
        setItems(lista.data);
        // Si la pagina quedo vacia (p. ej. tras resolver todo lo que mostraba), volver a la ultima con datos
        if (n > 0 && lista.data.length === 0) setPagina(Math.ceil(n / POR_PAGINA));
      })
      .catch(() => setAviso({ ok: false, texto: "No se pudieron cargar las incidencias" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
  }, [pestana, niveles, pagina, equipoFiltro]);

  useEnVivo({ incidencia: () => cargar(true) });

  // Cambiar el filtro reinicia pagina y seleccion
  const elegirPestana = (id: string) => {
    setPestana(id);
    setPagina(1);
    limpiarSeleccion();
  };
  const alternarNivel = (n: Nivel) => {
    setNiveles((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
    setPagina(1);
    limpiarSeleccion();
  };
  const elegirEquipo = (id: number | null) => {
    setEquipoFiltro(id);
    setPagina(1);
    limpiarSeleccion();
  };
  const irAPagina = (p: number) => {
    setPagina(p);
    limpiarSeleccion();
  };
  const limpiarSeleccion = () => {
    setSeleccion(new Set());
    setTodoElFiltro(false);
  };

  const porTipo = useMemo(() => {
    const acc: Record<string, { tipo: string; critico: number; advertencia: number }> = {};
    for (const f of resumen) {
      if ((estados.length && !estados.includes(f.estado)) || (niveles.length && !niveles.includes(f.nivel))) continue;
      acc[f.tipo] ??= { tipo: f.tipo, critico: 0, advertencia: 0 };
      acc[f.tipo][f.nivel] += f.total;
    }
    // Orden fijo por tipo: si siguiera el orden de llegada, las barras cambiarian de lugar en cada actualizacion
    return Object.values(acc).sort((a, b) => a.tipo.localeCompare(b.tipo));
  }, [resumen, estados, niveles]);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const seleccionables = items.filter((i) => i.estado !== "resuelta");
  const paginaSeleccionada = seleccionables.length > 0 && seleccionables.every((i) => seleccion.has(i.id));
  const cantidadSeleccion = todoElFiltro ? total : seleccion.size;
  const objetivoSeleccion: Objetivo = todoElFiltro ? { filtro: true } : { ids: [...seleccion] };

  const alternarSeleccion = (id: number) => {
    setTodoElFiltro(false);
    setSeleccion((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };
  const alternarPagina = () => {
    setTodoElFiltro(false);
    setSeleccion(paginaSeleccionada ? new Set() : new Set(seleccionables.map((i) => i.id)));
  };

  // Reconocer una sola alerta no pide confirmacion; resolver o actuar en lote abre el dialogo
  const pedir = (destino: Destino, objetivo: Objetivo, cantidad: number) => {
    if (destino === "reconocida" && "ids" in objetivo && objetivo.ids.length === 1) ejecutar(destino, objetivo);
    else setPedido({ destino, objetivo, cantidad });
  };

  const ejecutar = (destino: Destino, objetivo: Objetivo, nota?: string) => {
    setPedido(null);
    const previos = items;
    // Actualizacion inmediata en pantalla; si la API falla se restaura
    if ("ids" in objetivo) {
      setItems((lista) =>
        lista.map((i) => (objetivo.ids.includes(i.id) && (destino === "resuelta" || i.estado === "activa") ? { ...i, estado: destino } : i)),
      );
    }
    const peticion =
      "ids" in objetivo && objetivo.ids.length === 1
        ? api.put(`/incidencias/${objetivo.ids[0]}`, { estado: destino, nota }).then(() => ({ actualizadas: 1, omitidas: 0 }))
        : api
            .put("/incidencias/lote", {
              estado: destino,
              nota,
              ...("ids" in objetivo ? { ids: objetivo.ids } : { estados: estados.length ? estados : ["activa", "reconocida"], niveles: niveles.length ? niveles : undefined, equipo_id: equipoFiltro ?? undefined }),
            })
            .then((r) => r.data as { actualizadas: number; omitidas: number });
    peticion
      .then(({ actualizadas, omitidas }) => {
        const accion = destino === "reconocida" ? "reconocida(s)" : "resuelta(s)";
        setAviso({
          ok: true,
          texto: `${actualizadas} incidencia(s) ${accion}` + (omitidas ? `; ${omitidas} omitida(s) porque ya estaban en ese estado o más avanzadas` : ""),
        });
        limpiarSeleccion();
        cargar(true);
      })
      .catch((e) => {
        setItems(previos);
        setAviso({ ok: false, texto: e.response?.data?.detail ?? "No se pudo actualizar la incidencia" });
      });
  };

  const accionesLote = pestana !== "resueltas";

  return (
    <Layout>
      <div className="pgp-fade-in" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
          <select
            aria-label="Equipo"
            value={equipoFiltro ?? ""}
            onChange={(e) => elegirEquipo(e.target.value ? Number(e.target.value) : null)}
            style={{ ...chip(equipoFiltro !== null), outline: "none" }}
          >
            <option value="" style={{ background: "var(--bg-card)", color: "var(--txt1)" }}>Todos los equipos</option>
            {equipos.map((eq) => (
              <option key={eq.id} value={eq.id} style={{ background: "var(--bg-card)", color: "var(--txt1)" }}>
                {eq.nombre}
              </option>
            ))}
          </select>
          <button onClick={() => cargar()} style={{ ...boton("var(--border2)"), color: "var(--txt2)" }}>
            Actualizar
          </button>
          <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
            {(["excel", "pdf"] as const).map((formato) => (
              <button
                key={formato}
                onClick={() => descargar(formato)}
                disabled={!equipoReporte || descargando !== null}
                style={{ padding: "5px 12px", background: "var(--accent)", border: "none", borderRadius: "4px", color: "#fff", fontSize: "12px", cursor: equipoReporte && !descargando ? "pointer" : "not-allowed", fontWeight: 700, opacity: descargando ? 0.6 : 1 }}
                title={equipoReporte ? `Reporte ${formato === "excel" ? "Excel" : "PDF"} del equipo #${equipoReporte}` : "Selecciona un equipo primero"}
              >
                {descargando === formato ? "Generando..." : `Descargar ${formato === "excel" ? "Excel" : "PDF"}`}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
          <div role="group" aria-label="Estado de las incidencias" style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {PESTANAS.map((p) => (
              <button key={p.id} aria-pressed={pestana === p.id} onClick={() => elegirPestana(p.id)} style={chip(pestana === p.id)}>
                {p.etiqueta} · {contar(resumen, p.estados, niveles)}
              </button>
            ))}
          </div>
          <span aria-hidden="true" style={{ width: "1px", height: "22px", background: "var(--border)", margin: "0 4px" }} />
          <div role="group" aria-label="Nivel" style={{ display: "flex", gap: "6px" }}>
            {NIVELES.map((n) => (
              <button key={n.id} aria-pressed={niveles.includes(n.id)} onClick={() => alternarNivel(n.id)} style={{ ...chip(niveles.includes(n.id)), display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <span aria-hidden="true" style={{ width: "8px", height: "8px", borderRadius: "50%", background: n.color }} />
                {n.etiqueta} · {contar(resumen, estados, [n.id])}
              </button>
            ))}
          </div>
        </div>

        {aviso && (
          <div role="status" className={`pgp-alert ${aviso.ok ? "pgp-alert-ok" : "pgp-alert-err"}`} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ flex: 1 }}>{aviso.texto}</span>
            <button onClick={() => setAviso(null)} aria-label="Cerrar aviso" style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", fontSize: "16px", lineHeight: 1 }}>
              ×
            </button>
          </div>
        )}

        {loading && <div className="pgp-alert pgp-alert-info">Cargando incidencias...</div>}

        {porTipo.length > 0 && (
          <div className="pgp-card">
            <div className="pgp-card-title">Incidencias por Tipo</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={porTipo}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="tipo" stroke="var(--txt3)" fontSize={12} />
                <YAxis stroke="var(--txt3)" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "var(--bg-card)", color: "var(--txt1)", border: "1px solid var(--border2)", borderRadius: "6px", fontSize: "13px" }} cursor={{ fill: "var(--accent-bg)" }} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="critico" name="Crítico" stackId="n" fill="var(--danger-soft)" isAnimationActive={false} />
                <Bar dataKey="advertencia" name="Advertencia" stackId="n" fill="var(--warn-soft)" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {accionesLote && items.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px", fontSize: "12px", color: "var(--txt2)", padding: "0 4px" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", fontWeight: 600 }}>
              <input type="checkbox" checked={paginaSeleccionada} onChange={alternarPagina} disabled={!seleccionables.length} />
              Seleccionar página
            </label>
            {paginaSeleccionada && !todoElFiltro && total > seleccion.size && (
              <button onClick={() => setTodoElFiltro(true)} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "12px", fontWeight: 600, padding: 0 }}>
                Seleccionar las {total} del filtro
              </button>
            )}
            {cantidadSeleccion > 0 && (
              <>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>{cantidadSeleccion} seleccionada(s)</span>
                <button onClick={() => pedir("reconocida", objetivoSeleccion, cantidadSeleccion)} style={boton("var(--warn)")}>
                  Reconocer
                </button>
                <button onClick={() => pedir("resuelta", objetivoSeleccion, cantidadSeleccion)} style={boton("var(--ok)")}>
                  Resolver
                </button>
                <button onClick={limpiarSeleccion} style={{ ...boton("var(--border2)"), color: "var(--txt2)" }}>
                  Quitar selección
                </button>
              </>
            )}
          </div>
        )}

        {items.length === 0 && !loading ? (
          <div className="pgp-card" style={{ textAlign: "center", color: "var(--txt3)", padding: "40px" }}>
            No hay incidencias con este filtro
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {items.map((inc) => (
              <div
                key={inc.id}
                className="pgp-card"
                style={{ borderLeft: `4px solid ${inc.nivel === "critico" ? "var(--danger-soft)" : "var(--warn-soft)"}`, borderRadius: "6px", padding: "10px 14px" }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  {accionesLote && (
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar incidencia ${inc.id}`}
                      checked={todoElFiltro || seleccion.has(inc.id)}
                      onChange={() => alternarSeleccion(inc.id)}
                      disabled={inc.estado === "resuelta" || todoElFiltro}
                      style={{ marginTop: "3px", visibility: inc.estado === "resuelta" ? "hidden" : "visible" }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span className={`pgp-dot ${inc.nivel === "critico" ? "pgp-dot-err" : "pgp-dot-warn"}`}></span>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--txt1)" }}>{inc.tipo}</span>
                      <span className={estadoBadge(inc.estado)}>{inc.estado.charAt(0).toUpperCase() + inc.estado.slice(1)}</span>
                      <span style={{ fontSize: "12px", color: "var(--txt3)" }}>Equipo #{inc.equipo_id}</span>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--txt2)", marginBottom: "4px", lineHeight: 1.4 }}>{inc.descripcion}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "12px", color: "var(--txt3)" }}>
                      <span>Medido: <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--txt2)" }}>{inc.valor_medido !== null ? Number(inc.valor_medido).toFixed(2) : "-"}</span></span>
                      <span>Umbral: <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--txt2)" }}>{inc.umbral_config !== null ? Number(inc.umbral_config).toFixed(2) : "-"}</span></span>
                      <span>{formatFecha(inc.timestamp)}</span>
                    </div>
                    {(inc.reconocida_por || inc.resuelta_por) && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "12px", color: "var(--txt3)", marginTop: "4px" }}>
                        {inc.reconocida_por && inc.reconocida_en && <span>Reconocida por {inc.reconocida_por} · {formatFecha(inc.reconocida_en)}</span>}
                        {inc.resuelta_por && inc.resuelta_en && (
                          <span>
                            Resuelta por {inc.resuelta_por} · {formatFecha(inc.resuelta_en)}
                            {inc.nota_resolucion && <span style={{ color: "var(--txt2)" }}> — {inc.nota_resolucion}</span>}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: "6px" }}>
                    <button onClick={() => setDetalle(inc)} style={boton("var(--accent)")}>
                      Detalles
                    </button>
                    {inc.estado === "activa" && (
                      <button onClick={() => pedir("reconocida", { ids: [inc.id] }, 1)} style={boton("var(--warn)")}>
                        Reconocer
                      </button>
                    )}
                    {inc.estado !== "resuelta" && (
                      <button onClick={() => pedir("resuelta", { ids: [inc.id] }, 1)} style={boton("var(--ok)")}>
                        Resolver
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {totalPaginas > 1 && (
              <nav aria-label="Paginación de incidencias" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginTop: "6px" }}>
                <button onClick={() => irAPagina(pagina - 1)} disabled={pagina <= 1} style={{ ...boton("var(--border2)", pagina <= 1), color: "var(--txt2)", padding: "5px 12px" }}>
                  Anterior
                </button>
                <span style={{ fontSize: "12px", color: "var(--txt3)", fontVariantNumeric: "tabular-nums" }}>
                  Página {pagina} de {totalPaginas} · {total} incidencia(s)
                </span>
                <button onClick={() => irAPagina(pagina + 1)} disabled={pagina >= totalPaginas} style={{ ...boton("var(--border2)", pagina >= totalPaginas), color: "var(--txt2)", padding: "5px 12px" }}>
                  Siguiente
                </button>
              </nav>
            )}
          </div>
        )}
      </div>
      {detalle && <DetalleIncidencia incidencia={detalle} onClose={cerrarDetalle} />}
      {pedido && <DialogoAccion pedido={pedido} onCancel={cerrarPedido} onConfirm={(nota) => ejecutar(pedido.destino, pedido.objetivo, nota)} />}
    </Layout>
  );
}

function DialogoAccion({ pedido, onCancel, onConfirm }: { pedido: Pedido; onCancel: () => void; onConfirm: (nota?: string) => void }) {
  const [nota, setNota] = useState("");
  const notaRef = useRef<HTMLTextAreaElement>(null);
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const resolver = pedido.destino === "resuelta";

  useEffect(() => {
    (notaRef.current ?? cancelarRef.current)?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const verbo = resolver ? "Resolver" : "Reconocer";
  const titulo = pedido.cantidad > 1 ? `${verbo} ${pedido.cantidad} incidencias` : `${verbo} incidencia`;
  const mensaje =
    pedido.cantidad === 1
      ? "Se marcará la incidencia como resuelta."
      : `Se ${resolver ? "resolverán" : "reconocerán"} ${pedido.cantidad} incidencias. Las que ya estén en ese estado se omitirán.`;

  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(10, 16, 24, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", zIndex: 1000 }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialogo-accion-titulo"
        onClick={(e) => e.stopPropagation()}
        className="pgp-card pgp-fade-in"
        style={{ width: "min(440px, 100%)", display: "flex", flexDirection: "column", gap: "12px" }}
      >
        <h2 id="dialogo-accion-titulo" style={{ fontSize: "17px", fontWeight: 700, color: "var(--txt1)", margin: 0 }}>
          {titulo}
        </h2>
        <p style={{ fontSize: "13px", color: "var(--txt2)", margin: 0 }}>{mensaje}</p>
        {resolver && (
          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", fontWeight: 600, color: "var(--txt2)" }}>
            Causa o acción tomada (opcional)
            <textarea
              ref={notaRef}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Ej.: se redistribuyó la carga entre fases"
              style={{ padding: "8px 10px", background: "var(--bg-deep)", border: "1px solid var(--border)", borderRadius: "4px", color: "var(--txt1)", fontSize: "13px", fontFamily: "inherit", fontWeight: 400, resize: "vertical" }}
            />
          </label>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button ref={cancelarRef} onClick={onCancel} style={{ ...boton("var(--border2)"), color: "var(--txt2)", padding: "6px 14px" }}>
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(nota.trim() || undefined)}
            style={{ ...boton(resolver ? "var(--ok)" : "var(--warn)"), background: resolver ? "var(--ok)" : "var(--warn)", color: "var(--bg-card)", padding: "6px 14px" }}
          >
            {verbo}
          </button>
        </div>
      </div>
    </div>
  );
}
