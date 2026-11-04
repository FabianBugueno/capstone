export default function GaugeSVG({
  value,
  max,
  label,
  unit,
  color,
}: {
  value: number;
  max: number;
  label: string;
  unit: string;
  color: string;
}) {
  const pct = Math.max(0, Math.min(value / max, 1));
  const r = 38;
  const cx = 50;
  const cy = 50;

  const arcPath = (startAngle: number, endAngle: number) => {
    const s = ((startAngle - 90) * Math.PI) / 180;
    const e = ((endAngle - 90) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(s);
    const y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e);
    const y2 = cy + r * Math.sin(e);
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };
  // El arco es siempre el mismo trazo; solo se anima cuanto se rellena (stroke-dashoffset),
  // asi la forma no se deforma entre lecturas como pasaba al interpolar el atributo "d"
  const arco = arcPath(-120, 120);

  return (
    <div className="pgp-gauge-wrap">
      <svg width="112" height="88" viewBox="0 0 100 80" aria-hidden="true">
        <path d={arco} fill="none" stroke="var(--border)" strokeWidth="6" strokeLinecap="round" />
        <path
          d={arco}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="100 100"
          strokeDashoffset={100 - pct * 100}
          className="pgp-gauge-arco"
        />
        <text x={cx} y={cy - 1} textAnchor="middle" fill={color} fontSize="16" fontWeight="700" className="pgp-gauge-num">
          {value}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--txt3)" fontSize="11">
          {unit}
        </text>
      </svg>
      <div className="pgp-gauge-label">{label}</div>
    </div>
  );
}
