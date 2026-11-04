import { useEffect, useState } from "react";
import api from "../api/axios";
import useEnVivo, { type MedicionVivo } from "./useEnVivo";

export interface EquipoBasico {
  id: number;
  nombre: string;
}

const CLAVE = "equipoId";

function equipoGuardado(): number | null {
  try {
    const v = Number(localStorage.getItem(CLAVE));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}

// Equipo seleccionado (compartido entre pestañas) + su ultima medicion, actualizada en vivo
export default function useMedicionEnVivo() {
  const [equipos, setEquipos] = useState<EquipoBasico[]>([]);
  const [equipoId, setEquipoIdState] = useState<number | null>(equipoGuardado);
  const [medicion, setMedicion] = useState<MedicionVivo | null>(null);
  const [recibidas, setRecibidas] = useState(0);

  const setEquipoId = (id: number) => {
    setEquipoIdState(id);
    try {
      localStorage.setItem(CLAVE, String(id));
    } catch {
      // sin almacenamiento: la seleccion solo dura en esta pestaña
    }
  };

  useEffect(() => {
    api
      .get("/equipos/")
      .then((res) => {
        setEquipos(res.data);
        const ids = res.data.map((e: EquipoBasico) => e.id);
        if (ids.length > 0 && !ids.includes(equipoGuardado())) setEquipoId(ids[0]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!equipoId) return;
    setMedicion(null);
    api
      .get(`/mediciones/ultima/${equipoId}`)
      .then((res) => setMedicion(res.data))
      .catch(() => {});
  }, [equipoId]);

  useEnVivo({
    medicion: (m) => {
      if (m.equipo_id !== equipoId) return;
      setMedicion(m);
      setRecibidas((n) => n + 1);
    },
  });

  return { equipos, equipoId, setEquipoId, medicion, recibidas };
}
