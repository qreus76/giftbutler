interface DataPoint {
  date: string;
  count: number;
}

interface Props {
  data: DataPoint[];
  color?: string;
  gradientId: string;
  formatY?: (val: number) => string;
}

export default function LineChart({ data, color = "#111111", gradientId, formatY }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-28 flex items-center justify-center text-[#CCCCCC] text-xs">
        No data yet for this period
      </div>
    );
  }

  const W = 600;
  const H = 110;
  const pad = { top: 8, right: 8, bottom: 22, left: 28 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;

  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const xStep = data.length > 1 ? cW / (data.length - 1) : cW / 2;

  const pts = data.map((d, i) => ({
    x: pad.left + i * xStep,
    y: pad.top + cH - (d.count / maxVal) * cH,
    ...d,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${(pad.top + cH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(pad.top + cH).toFixed(1)} Z`;

  const labelIndices = data.length <= 5
    ? data.map((_, i) => i)
    : [0, Math.floor(data.length / 4), Math.floor(data.length / 2), Math.floor((data.length * 3) / 4), data.length - 1];

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.12" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Gridlines */}
      {[0, 0.5, 1].map((frac) => (
        <line
          key={frac}
          x1={pad.left} y1={pad.top + cH * frac}
          x2={pad.left + cW} y2={pad.top + cH * frac}
          stroke="#E0E0D8" strokeWidth="1"
        />
      ))}

      {/* Area */}
      <path d={areaPath} fill={`url(#${gradientId})`} />

      {/* Line */}
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Data points */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} />
      ))}

      {/* X axis labels */}
      {labelIndices.map((i) => (
        <text key={i} x={pts[i].x} y={H - 4} textAnchor="middle" fontSize="8" fill="#888888">
          {new Date(pts[i].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </text>
      ))}

      {/* Y axis */}
      <text x={pad.left - 4} y={pad.top + 4} textAnchor="end" fontSize="8" fill="#888888">
        {formatY ? formatY(maxVal) : maxVal.toLocaleString()}
      </text>
      <text x={pad.left - 4} y={pad.top + cH + 2} textAnchor="end" fontSize="8" fill="#888888">
        {formatY ? formatY(0) : "0"}
      </text>
    </svg>
  );
}
