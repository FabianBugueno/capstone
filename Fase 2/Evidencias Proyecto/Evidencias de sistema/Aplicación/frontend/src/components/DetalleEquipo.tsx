import { useEffect, useRef, useState } from "react";
import api from "../api/axios";
import { LECTURAS, UMBRALES, num } from "../lib/medicion";
import { Fila, Seccion, Vacio } from "./DetalleIncidencia";

export interface Equipo {
  id: number;
  cliente_id: number;
  nombre: string;
  ubicacion: string | null;
  estado: string;
  fecha_registro: string;
}

type Medicion = Record<string, number | string | null> & { timestamp: string };

const ESTADOS_INC: [string, string][] = [
  ["activa", "Sin reconocer"],
  ["reconocida", "Reconocidas"],
  ["resuelta", "Resueltas"],
];

export default function DetalleEquipo({ equipo, onClose }: { equipo: Equipo; onClose: () => void }) {
  const [medicion, setMedicion] = useState<Medicion | null>(null);
  const [umbrales, setUmbrales] = useState<Record<string, number> | null>(null);
  const [conteo, setConteo] = useState<Record<string, number> | null>(null);
  const [cargando, setCargando] = useState(true);
  const cerrarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const id = equipo.id;
    // Cada consulta es independiente: si una falla, el resto del detalle se muestra igual
    Promise.allSettled([
      api.get(`/mediciones/ultima/${id}`).then((r) => setMedicion(r.data)),
      api.get(`/parametros/${id}`).then((r) => setUmbrales(r.data)),
      api.get("/incidencias/resumen", { params: { equipo_id: id } }).then((r) => {
        const acc: Record<string, number> = {};
        for (const f of r.data as { estado: string; total: number }[]) acc[f.estado] = (acc[f.estado] ?? 0) + f.total;
        setConteo(acc);
      }),
    ]).finally(() => setCargando(false));
  }, [equipo.id]);

  useEffect(() => {
    cerrarRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="pgp-modal-velo" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="detalle-equipo-titulo"
        onClick={(e) => e.stopPropagation()}
        className="pgp-card pgp-fade-in"
        style={{ width: "min(760px, 100%)", maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}
      >
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
          <div>
            <h2 id="detalle-equipo-titulo" style={{ fontSize: "18px", fontWeight: 700, color: "var(--txt1)", margin: 0 }}>
              {equipo.nombre}
            </h2>
            <p style={{ fontSize: "12px", color: "var(--txt3)", margin: "4px 0 0" }}>
              Equipo #{equipo.id} · {equipo.estado.charAt(0).toUpperCase() + equipo.estado.slice(1)}
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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
          <Seccion titulo="Datos del equipo">
            <Fila etiqueta="Ubicación" valor={equipo.ubicacion?.trim() || "Sin ubicación definida"} />
            <Fila etiqueta="Cliente" valor={`#${equipo.cliente_id}`} />
            <Fila etiqueta="Registrado" valor={new Date(equipo.fecha_registro).toLocaleString("es-CL")} />
          </Seccion>
          <Seccion titulo="Incidencias">
            {conteo ? (
              ESTADOS_INC.map(([k, etiqueta]) => <Fila key={k} etiqueta={etiqueta} valor={String(conteo[k] ?? 0)} />)
            ) : (
              <Vacio texto={cargando ? "Cargando..." : "No disponible"} />
            )}
          </Seccion>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
          <Seccion titulo={medicion ? `Última medición · ${new Date(medicion.timestamp).toLocaleString("es-CL")}` : "Última medición"}>
            {medicion ? (
              LECTURAS.map(([k, etiqueta, u]) => <Fila key={k} etiqueta={etiqueta} valor={num(medicion[k], u)} />)
            ) : (
              <Vacio texto={cargando ? "Cargando..." : "Sin mediciones registradas"} />
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
