import { useEffect, useState } from "react";
import { obtenerRiesgoEquipo } from "../api/ml";
import type { RiesgoEquipoResponse } from "../api/ml";

// Riesgo de falla estimado por el modelo ML; se refresca cada 10 s
export default function useRiesgoML(equipoId: number | null) {
  const [riesgo, setRiesgo] = useState<RiesgoEquipoResponse | null>(null);

  useEffect(() => {
    if (!equipoId) return;
    const cargarRiesgo = async () => {
      try {
        setRiesgo(await obtenerRiesgoEquipo(equipoId));
      } catch (err) {
        console.error("Error al obtener predicción ML", err);
      }
    };

    cargarRiesgo();
    const intervalo = setInterval(cargarRiesgo, 10000);
    return () => clearInterval(intervalo);
  }, [equipoId]);

  return riesgo;
}
