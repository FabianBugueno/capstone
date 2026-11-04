import { useEffect, useRef } from "react";
import { cerrarSesion, tokenVigente } from "../api/sesion";

// Medicion tal como la emite el backend (los Decimal llegan como string)
export interface MedicionVivo {
  equipo_id: number;
  timestamp: string;
  [campo: string]: string | number | null;
}

interface Handlers {
  medicion?: (m: MedicionVivo) => void;
  incidencia?: (d: { equipo_id: number; nuevas: number }) => void;
}

// Suscripcion SSE a /en-vivo: cada medicion e incidencia llega en cuanto el backend la guarda.
export default function useEnVivo(handlers: Handlers) {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    // EventSource reconecta solo si se corta la conexion
    const es = new EventSource(`/api/en-vivo?token=${encodeURIComponent(token)}`);
    es.addEventListener("medicion", (e) => ref.current.medicion?.(JSON.parse(e.data)));
    es.addEventListener("incidencia", (e) => ref.current.incidencia?.(JSON.parse(e.data)));
    // El backend rechaza la conexion (401) con token vencido y EventSource reintentaria para siempre
    es.onerror = () => {
      if (!tokenVigente()) {
        es.close();
        cerrarSesion();
      }
    };
    return () => es.close();
  }, []);
}
