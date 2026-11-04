import { useState } from "react";
import { INSTALACION_DEFECTO, type Instalacion } from "../lib/calculos";

// Parametros de instalacion (datos de placa que la medicion no entrega), compartidos entre pestañas
const CLAVE = "instalacion";

export default function useInstalacion() {
  const [inst, setInst] = useState<Instalacion>(() => {
    try {
      return { ...INSTALACION_DEFECTO, ...JSON.parse(localStorage.getItem(CLAVE) ?? "{}") };
    } catch {
      return INSTALACION_DEFECTO;
    }
  });
  const cambiar = (k: keyof Instalacion, v: number) => {
    if (!Number.isFinite(v) || v <= 0 || (k === "fp_objetivo" && v > 1)) return;
    const nuevo = { ...inst, [k]: v };
    setInst(nuevo);
    try {
      localStorage.setItem(CLAVE, JSON.stringify(nuevo));
    } catch {
      // sin almacenamiento: los valores duran solo en esta vista
    }
  };
  return [inst, cambiar] as const;
}
