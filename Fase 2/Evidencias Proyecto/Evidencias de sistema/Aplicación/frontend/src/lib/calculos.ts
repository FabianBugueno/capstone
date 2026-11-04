// Calculos electricos del prototipo del cliente (prototipo/prototipo.html, funcion calcular),
// alimentados con la ultima medicion en vivo + los parametros de instalacion.
// Modelos simplificados (IEC 60909, NFPA 70E): orientativos, no reemplazan un estudio profesional.

export interface Instalacion {
  s_tr_kva: number; // potencia del transformador
  z_tr_pct: number; // impedancia de cortocircuito del transformador
  l_km: number; // largo de la linea de distribucion
  l_sec_mm2: number; // seccion del conductor
  fp_objetivo: number;
}

export const INSTALACION_DEFECTO: Instalacion = {
  s_tr_kva: 250,
  z_tr_pct: 4.5,
  l_km: 0.18,
  l_sec_mm2: 95,
  fp_objetivo: 0.95,
};

export interface Lectura {
  va: number;
  vb: number;
  vc: number;
  ia: number;
  ib: number;
  ic: number;
  fp: number;
  thd: number;
  frecuencia: number;
  temp: number;
}

type MedicionCruda = Record<string, string | number | null | undefined>;

// El backend entrega los Decimal como string; null si falta algun valor clave
export function leer(m: MedicionCruda | null | undefined): Lectura | null {
  if (!m) return null;
  const n = (k: string) => (m[k] == null ? NaN : Number(m[k]));
  const l = {
    va: n("voltaje_l1"),
    vb: n("voltaje_l2"),
    vc: n("voltaje_l3"),
    ia: n("corriente_l1"),
    ib: n("corriente_l2"),
    ic: n("corriente_l3"),
    fp: n("factor_potencia"),
    thd: n("thd"),
    frecuencia: n("frecuencia"),
    temp: n("temperatura_gabinete"),
  };
  return [l.va, l.vb, l.vc, l.ia, l.ib, l.ic, l.fp].some(Number.isNaN) ? null : l;
}

export interface Armonico {
  n: number;
  freq: number;
  pct: number;
}

// Distribucion tipica de cargas no lineales (VFDs, rectificadores) escalada por el THD medido
export function armonicos(thd: number, f0 = 50): Armonico[] {
  const peso: Record<number, number> = {
    3: 0.08, 5: 0.55, 7: 0.35, 9: 0.04, 11: 0.22, 13: 0.16,
    15: 0.02, 17: 0.09, 19: 0.07, 23: 0.05, 25: 0.04,
  };
  return [
    { n: 1, freq: f0, pct: 100 },
    ...Object.entries(peso).map(([n, k]) => ({ n: Number(n), freq: Number(n) * f0, pct: thd * k })),
  ];
}

export function calcular(l: Lectura, inst: Instalacion) {
  // Las mediciones son fase-neutro; el prototipo trabaja con tension de linea
  const Vfn = (l.va + l.vb + l.vc) / 3;
  const V = Vfn * Math.sqrt(3);
  const I = (l.ia + l.ib + l.ic) / 3;
  const fp = Math.min(1, Math.max(0.01, l.fp));
  const phi = Math.acos(fp);

  const S = (Math.sqrt(3) * V * I) / 1000; // kVA
  const P = S * fp; // kW
  const Q = P * Math.tan(phi); // kVAr

  // Linea de distribucion (cobre)
  const rho = 0.0176;
  const R_lin = (rho * inst.l_km * 1000) / inst.l_sec_mm2;
  const X_lin = 0.08 * inst.l_km;
  const Z_lin = Math.hypot(R_lin, X_lin);
  const U_drop = (Math.sqrt(3) * R_lin * I * fp + X_lin * I * Math.sin(phi)) / 1000; // kV
  const U_drop_pct = (U_drop / (V / 1000)) * 100;

  const vMax = Math.max(l.va, l.vb, l.vc);
  const vMin = Math.min(l.va, l.vb, l.vc);
  const desbalance = ((vMax - vMin) / vMin) * 100;

  // Transformador + cortocircuito (IEC 60909 simplificado)
  const Z_tr = ((inst.z_tr_pct / 100) * V ** 2) / (inst.s_tr_kva * 1000);
  const Z_tot = Z_tr + Z_lin;
  const Icc_ori = V / (Z_tr * Math.sqrt(3));
  const Icc_tab = V / (Z_tot * Math.sqrt(3));

  // Arco electrico (estimacion NFPA 70E simplificada)
  const E_arc = 0.0093 * (Icc_tab / 1000) ** 2;
  const afie = E_arc > 40 ? 4 : E_arc > 8 ? 3 : E_arc > 4 ? 2 : 1;

  // Compensacion activa hasta el fp objetivo
  const phi2 = Math.acos(inst.fp_objetivo);
  const Qc = Math.max(0, P * (Math.tan(phi) - Math.tan(phi2)));
  const Q_fin = Math.max(0, Q - Qc);
  const S_fin = Math.hypot(P, Q_fin);
  const fp_fin = Math.min(1, P / S_fin);
  const I_fin = (S_fin * 1000) / (Math.sqrt(3) * V);
  const redI_pct = ((I - I_fin) / I) * 100;
  const redPerd_pct = (1 - (I_fin / I) ** 2) * 100;

  // Filtro activo DSP: reduccion tipica 60-75 % del THD
  const thd_post = l.thd * 0.35;

  // Curva de rele IEC inversa estandar (TMS = 1) y disparo instantaneo
  const curvas = [1.2, 1.5, 2, 3, 5, 7, 10, 15, 20, 30, 50, 100, 200].map((r) => ({
    multiplo: `${r}×In`,
    iec: 0.14 / (Math.pow(r, 0.02) - 1),
    instantaneo: r * I > Icc_tab * 0.8 ? 0.02 : null,
  }));

  return {
    V, Vfn, I, fp, S, P, Q,
    R_lin, X_lin, Z_lin, U_drop, U_drop_pct, desbalance,
    Z_tr, Z_tot, Icc_ori, Icc_tab, E_arc, afie,
    Qc, Q_fin, S_fin, fp_fin, I_fin, redI_pct, redPerd_pct,
    thd_post, curvas,
  };
}

export type Calculo = ReturnType<typeof calcular>;

// Semaforos compartidos (mismos umbrales del prototipo)
export type Tono = "ok" | "warn" | "err" | undefined;
export const tonoFp = (v: number): Tono => (v >= 0.95 ? "ok" : v >= 0.9 ? "warn" : "err");
export const tonoThd = (v: number): Tono => (v <= 5 ? "ok" : v <= 8 ? "warn" : "err");
export const tonoDesbalance = (v: number): Tono => (v < 2 ? "ok" : "err"); // IEC 61000-3-13: sobre 2 % ya esta fuera de limite
export const tonoCaida = (v: number): Tono => (v < 3 ? "ok" : v < 5 ? "warn" : "err");

export const tooltipStyle = {
  backgroundColor: "var(--bg-card)",
  color: "var(--txt1)",
  border: "1px solid var(--border2)",
  borderRadius: "6px",
  fontSize: "13px",
};
