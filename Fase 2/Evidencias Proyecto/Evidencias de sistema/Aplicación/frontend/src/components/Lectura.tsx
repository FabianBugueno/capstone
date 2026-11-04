// Firma del diseño: cada lectura protagonista lleva su historial tipo boleta (ultimas mediciones)
// con el limite trazado como filete; las barras fuera de limite se rellenan en rojo.

export interface Limite {
  min?: number;
  max?: number;
  texto: string; // p. ej. "Rango 210–240 V · IEC 61000"
}

const fuera = (v: number, l: Limite) => (l.max != null && v > l.max) || (l.min != null && v < l.min);

export function Historial({ valores, limite }: { valores: number[]; limite: Limite }) {
  if (valores.length === 0) return <div className="pgp-hist" />;
  const refs = [...valores, limite.min, limite.max].filter((v): v is number => v != null);
  let lo = Math.min(...refs);
  let hi = Math.max(...refs);
  const margen = (hi - lo || Math.abs(hi) || 1) * 0.15;
  lo -= margen;
  hi += margen;
  const pct = (v: number) => ((v - lo) / (hi - lo)) * 100;
  // Un rango (min y max) se dibuja como banda entre dos filetes: se ve que limite rompe cada barra
  const lineas = [limite.min, limite.max].filter((v): v is number => v != null);

  return (
    <div className="pgp-hist" aria-hidden="true">
      {valores.map((v, i) => (
        <i
          key={i}
          className={`${fuera(v, limite) ? "fuera" : ""} ${i === valores.length - 1 ? "ultima" : ""}`}
          style={{ height: `${Math.max(4, pct(v))}%` }}
        />
      ))}
      {lineas.length === 2 && (
        <span className="pgp-hist-banda" style={{ bottom: `${pct(lineas[0])}%`, height: `${pct(lineas[1]) - pct(lineas[0])}%` }} />
      )}
      {lineas.map((l) => (
        <span key={l} className="pgp-hist-limite" style={{ bottom: `${pct(l)}%` }} />
      ))}
    </div>
  );
}

export default function Lectura({
  label,
  valor,
  unidad,
  decimales,
  limite,
  historial,
}: {
  label: string;
  valor: number | null;
  unidad?: string;
  decimales: number;
  limite: Limite;
  historial: number[];
}) {
  const malo = valor != null && fuera(valor, limite);
  const tono = valor == null ? "var(--txt3)" : malo ? "var(--danger)" : "var(--ok)";
  return (
    <div className="pgp-lectura">
      <div className="pgp-lectura-label">{label}</div>
      <div className="pgp-lectura-val" style={{ color: malo ? "var(--danger)" : "var(--txt1)" }}>
        {/* key: al cambiar el valor el numero se vuelve a montar y hace su breve destello */}
        <span key={valor ?? "x"} className="pgp-tick">{valor == null ? "--" : valor.toFixed(decimales)}</span>
        {unidad && <small>{unidad}</small>}
      </div>
      <div className="pgp-lectura-lim" style={{ color: tono }}>
        {limite.texto} · {valor == null ? "sin dato" : malo ? "fuera de límite" : "dentro de límite"}
      </div>
      <Historial valores={historial} limite={limite} />
    </div>
  );
}
