interface SparklineProps {
  values: number[]
  width?: number
  height?: number
  className?: string
  tone?: "primary" | "tertiary"
  ariaLabel?: string
}

/**
 * Mini-gráfico de linha em SVG puro (sem dependências).
 * Usado para tendências ilustrativas na Visão Geral.
 */
export function Sparkline({
  values,
  width = 260,
  height = 64,
  className,
  tone = "primary",
  ariaLabel,
}: SparklineProps) {
  if (values.length < 2) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const stepX = width / (values.length - 1)
  const pad = 6

  const points = values.map((v, i) => {
    const x = i * stepX
    const y = pad + (height - pad * 2) * (1 - (v - min) / range)
    return [x, y] as const
  })

  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
  const area = `${line} ${width},${height} 0,${height}`
  const stroke =
    tone === "tertiary" ? "var(--color-tertiary)" : "var(--color-primary)"
  const gradientId = `spark-${tone}`
  const [lastX, lastY] = points[points.length - 1]

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradientId})`} />
      <polyline
        points={line}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r={3} fill={stroke} />
    </svg>
  )
}
