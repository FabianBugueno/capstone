import type { ReactNode } from "react";
import type { Instalacion, Tono } from "../lib/calculos";
import type { EquipoBasico } from "../hooks/useMedicionEnVivo";

// Piezas compartidas por las pestañas de Monitoreo Trifasico y Compensacion

const campo = {
  padding: "5px 8px",
  background: "var(--bg-deep)",
  border: "1px solid var(--border)",
  borderRadius: "4px",
  color: "var(--txt1)",
  fontSize: "13px",
  outline: "none",
};

const TONOS = { ok: "var(--ok)", warn: "var(--warn)", err: "var(--danger)" };
// El estado nunca depende solo del color
const PALABRA = { warn: "Atención", err: "Fuera de límite" } as const;

export function Dato({ label, valor, unidad, tono, texto }: { label: string; valor: ReactNode; unidad?: string; tono?: Tono; texto?: boolean }) {
  return (
    <div className="pgp-reading">
      <span className="pgp-reading-label" style={{ width: "auto", flex: 1 }}>{label}</span>
      {(tono === "warn" || tono === "err") && (
        <span className={`pgp-badge ${tono === "err" ? "pgp-badge-err" : "pgp-badge-warn"}`} style={{ fontSize: "12px", padding: "1px 7px" }}>
          {PALABRA[tono]}
        </span>
      )}
      <span className="pgp-reading-val" style={{ flex: "none", color: tono ? TONOS[tono] : undefined, fontSize: texto ? "14px" : undefined }}>
        {valor}
      </span>
      <span className="pgp-reading-unit" style={{ width: unidad ? "34px" : "0" }}>{unidad}</span>
    </div>
  );
}

// Barra de herramientas de cada pestaña: el titulo y la descripcion ya estan en la barra superior
export function Encabezado({
  equipos,
  equipoId,
  setEquipoId,
  enVivo,
}: {
  titulo?: string;
  sub?: string;
  equipos: EquipoBasico[];
  equipoId: number | null;
  setEquipoId: (id: number) => void;
  enVivo: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
      <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--txt2)", display: "flex", alignItems: "center", gap: "8px" }}>
        Equipo
        <select value={equipoId ?? ""} onChange={(e) => setEquipoId(Number(e.target.value))} style={{ ...campo, cursor: "pointer", minWidth: "200px" }}>
          {equipos.map((eq) => (
            <option key={eq.id} value={eq.id}>
              {eq.nombre}
            </option>
          ))}
        </select>
      </label>
      <span className={`pgp-badge ${enVivo ? "pgp-badge-ok" : "pgp-badge-info"}`}>
        {enVivo && <span className="pgp-dot pgp-dot-ok pgp-dot-pulse" />}
        {enVivo ? "En vivo" : "Esperando datos"}
      </span>
    </div>
  );
}

export function SinDatos() {
  return (
    <div className="pgp-card" style={{ textAlign: "center", color: "var(--txt3)", padding: "40px" }}>
      Esperando mediciones de este equipo...
    </div>
  );
}

// ── Parametros de instalacion (datos de placa que la medicion no entrega) ──

const CAMPOS: Record<keyof Instalacion, { label: string; unidad: string; step: number; max?: number }> = {
  s_tr_kva: { label: "Potencia transformador", unidad: "kVA", step: 10 },
  z_tr_pct: { label: "Impedancia Z", unidad: "%", step: 0.1 },
  l_km: { label: "Longitud línea", unidad: "km", step: 0.01 },
  l_sec_mm2: { label: "Sección conductor", unidad: "mm²", step: 1 },
  fp_objetivo: { label: "FP objetivo", unidad: "", step: 0.01, max: 1 },
};

export function ParametrosInstalacion({
  inst,
  cambiar,
  campos,
}: {
  inst: Instalacion;
  cambiar: (k: keyof Instalacion, v: number) => void;
  campos: (keyof Instalacion)[];
}) {
  return (
    <div className="pgp-card" style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", padding: "10px 14px" }}>
      <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent)" }}>
        Parámetros de instalación
      </span>
      {campos.map((k) => (
        <label key={k} style={{ fontSize: "12px", color: "var(--txt2)", display: "flex", alignItems: "center", gap: "6px" }}>
          {CAMPOS[k].label}
          <input
            type="number"
            min={0}
            max={CAMPOS[k].max}
            step={CAMPOS[k].step}
            defaultValue={inst[k]}
            onChange={(e) => cambiar(k, Number(e.target.value))}
            style={{ ...campo, width: "64px", fontVariantNumeric: "tabular-nums" }}
          />
          {CAMPOS[k].unidad}
        </label>
      ))}
    </div>
  );
}
