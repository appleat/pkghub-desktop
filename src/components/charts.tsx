interface Slice {
  label: string;
  value: number;
  color: string;
}

export function Donut({
  data,
  centerValue,
  centerLabel,
  size = 172,
  thickness = 22,
}: {
  data: Slice[];
  centerValue: string;
  centerLabel: string;
  size?: number;
  thickness?: number;
}) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  let acc = 0;
  const segments = data.map((d) => {
    const frac = total > 0 ? d.value / total : 0;
    const len = Math.max(frac * c - 2, 0);
    const offset = acc * c;
    acc += frac;
    return { ...d, len, offset };
  });

  return (
    <div className="donut-wrap" style={{ width: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f3f9" strokeWidth={thickness} />
        {segments.map((s, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={thickness}
            strokeDasharray={`${s.len} ${c - s.len}`}
            strokeDashoffset={-s.offset}
            transform={`rotate(-90 ${cx} ${cy})`}
          >
            <title>{`${s.label} · ${s.value}`}</title>
          </circle>
        ))}
      </svg>
      <div className="donut-center">
        <strong>{centerValue}</strong>
        <span>{centerLabel}</span>
      </div>
    </div>
  );
}

export function Bars({
  data,
  unit,
}: {
  data: Array<{ label: string; value: number; color: string; meta?: string }>;
  unit?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="bars">
      {data.map((d, i) => (
        <div className="bar-row" key={`${d.label}-${i}`}>
          <div className="bar-head">
            <span className="bar-label">
              <i style={{ background: d.color }} />
              {d.label}
            </span>
            <span className="bar-value">
              {d.meta ?? `${d.value}${unit ?? ""}`}
            </span>
          </div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{
                width: `${Math.max((d.value / max) * 100, 2)}%`,
                background: `linear-gradient(90deg, ${d.color}cc, ${d.color})`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Sparkline({ values, color = "#6366f1" }: { values: number[]; color?: string }) {
  const w = 96;
  const h = 28;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values.map((v, i) => `${i * step},${h - (v / max) * (h - 4) - 2}`).join(" ");
  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
