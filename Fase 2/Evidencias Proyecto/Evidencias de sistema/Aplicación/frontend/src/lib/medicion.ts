// Campos de medicion y umbrales que se muestran en los detalles (incidencia, equipo)
export const LECTURAS: [string, string, string][] = [
  ["voltaje_l1", "Voltaje L1", "V"],
  ["voltaje_l2", "Voltaje L2", "V"],
  ["voltaje_l3", "Voltaje L3", "V"],
  ["corriente_l1", "Corriente L1", "A"],
  ["corriente_l2", "Corriente L2", "A"],
  ["corriente_l3", "Corriente L3", "A"],
  ["thd", "THD", "%"],
  ["factor_potencia", "Factor de potencia", ""],
  ["frecuencia", "Frecuencia", "Hz"],
  ["temperatura_gabinete", "Temperatura gabinete", "°C"],
];

export const UMBRALES: [string, string, string][] = [
  ["voltaje_min", "Voltaje mínimo", "V"],
  ["voltaje_max", "Voltaje máximo", "V"],
  ["corriente_max", "Corriente máxima", "A"],
  ["thd_max", "THD máximo", "%"],
  ["factor_potencia_min", "FP mínimo", ""],
  ["frecuencia_nominal", "Frecuencia nominal", "Hz"],
];

export const num = (v: unknown, unidad = "") =>
  v === null || v === undefined || v === "" ? "–" : `${Number(v).toFixed(2)}${unidad ? ` ${unidad}` : ""}`;
