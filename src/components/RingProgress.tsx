interface Props {
  value: number
  max: number
  size?: number
  stroke?: number
  color?: string
  label?: string
  sublabel?: string
}

export default function RingProgress({ value, max, size = 100, stroke = 10, color = '#34d399', label, sublabel }: Props) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(value / max, 1)
  const offset = circ * (1 - pct)

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={pct >= 1 ? '#f87171' : color}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        {label && <span className="text-base font-bold leading-none">{label}</span>}
        {sublabel && <span className="text-[10px] text-slate-400 mt-0.5">{sublabel}</span>}
      </div>
    </div>
  )
}
