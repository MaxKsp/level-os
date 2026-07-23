import { useEffect, useRef, useState } from "react"

interface SparklineProps {
  values: number[]
  /** Altura em px do gráfico (largura é 100% do container, responsiva). */
  height?: number
  className?: string
  tone?: "primary" | "secondary" | "tertiary"
  ariaLabel?: string
  /** Rótulos do eixo X (ex.: meses), opcional — alinhados às amostras. */
  labels?: string[]
  /** Formata o valor exibido no tooltip. O padrão é moeda brasileira. */
  valueFormatter?: (value: number, index: number) => string
}

/**
 * Área/linha responsiva em SVG puro (sem lib).
 *
 * Correção de proporção: mede a largura REAL do container (ResizeObserver) e
 * desenha em coordenadas 1:1 (viewBox = pixels reais, preserveAspectRatio
 * padrão "xMidYMid meet"). Nada de `preserveAspectRatio=none` — que esticava a
 * curva. Funciona igual em 375px e em 4K (a largura útil é limitada pelo
 * container pai, não pelo SVG).
 */
export function Sparkline({
  values,
  height = 96,
  className,
  tone = "primary",
  ariaLabel,
  labels,
  valueFormatter = (value) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
}: SparklineProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const ro = new ResizeObserver((entries) => {
      setW(Math.round(entries[0].contentRect.width))
    })
    ro.observe(el)
    setW(Math.round(el.getBoundingClientRect().width))
    return () => ro.disconnect()
  }, [])

  const stroke = tone === "tertiary"
    ? "var(--color-tertiary)"
    : tone === "secondary"
      ? "var(--color-secondary)"
      : "var(--color-primary)"

  const empty = values.length === 0
  const data = values.length >= 2 ? values : [values[0] ?? 0, values[0] ?? 0]
  const padX = 8
  const padY = 10
  const innerW = Math.max(0, w - padX * 2)
  const innerH = height - padY * 2
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0

  const points = data.map((v, i) => {
    const x = padX + i * stepX
    const y = padY + innerH * (1 - (v - min) / range)
    return [x, y] as const
  })

  // Curva suave (Catmull-Rom → Bézier).
  const linePath = points
    .map(([x, y], i) => {
      if (i === 0) return `M ${x.toFixed(2)} ${y.toFixed(2)}`
      const [x0, y0] = points[i - 1]
      const [xp, yp] = points[i - 2] ?? points[i - 1]
      const [xn, yn] = points[i + 1] ?? points[i]
      const c1x = x0 + (x - xp) / 6
      const c1y = y0 + (y - yp) / 6
      const c2x = x - (xn - x0) / 6
      const c2y = y - (yn - y0) / 6
      return `C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(" ")
  const areaPath = `${linePath} L ${padX + innerW} ${height} L ${padX} ${height} Z`
  const [lastX, lastY] = points[points.length - 1] ?? [0, 0]
  const hoverPoint = hover !== null ? points[hover] : null
  const tooltipBelow = Boolean(hoverPoint && hoverPoint[1] < 54)
  const tooltipLeft = hoverPoint ? Math.min(Math.max(hoverPoint[0], 78), Math.max(78, w - 78)) : 0

  return (
    <div ref={ref} className={`relative min-w-0 w-full overflow-visible ${className ?? ""}`} style={{ height }}>
      {empty ? (
        <div className="flex h-full items-center justify-center text-sm text-muted">
          Sem dados no período.
        </div>
      ) : w > 0 ? (
        <>
          <svg
            width={w}
            height={height}
            viewBox={`0 0 ${w} ${height}`}
            className="spark-reveal block overflow-visible"
            role="group"
            aria-label={ariaLabel}
            onMouseLeave={() => setHover(null)}
            onPointerLeave={() => setHover(null)}
          >
            <path d={areaPath} fill={stroke} fillOpacity={0.055} />
            <path
              d={linePath}
              fill="none"
              stroke={stroke}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: `drop-shadow(0 0 5px color-mix(in srgb, ${stroke} 46%, transparent))` }}
            />

            {/* Zonas de interação por amostra: mouse, toque e teclado. */}
            {points.map(([x], i) => (
              <rect
                key={i}
                x={x - stepX / 2}
                y={0}
                width={stepX || innerW}
                height={height}
                fill="transparent"
                role="button"
                tabIndex={0}
                aria-label={`${labels?.[i] ? `${labels[i]}: ` : ""}${valueFormatter(data[i], i)}`}
                onPointerEnter={() => setHover(i)}
                onPointerDown={() => setHover(i)}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              />
            ))}

            {hover !== null ? (
              <g>
                <line
                  x1={points[hover][0]}
                  x2={points[hover][0]}
                  y1={padY}
                  y2={height - padY}
                  stroke="var(--color-outline)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <circle cx={points[hover][0]} cy={points[hover][1]} r={4} fill={stroke} />
              </g>
            ) : null}

            <circle cx={lastX} cy={lastY} r={3.5} fill={stroke} className="spark-dot" />
          </svg>

          {hover !== null ? (
            <div
              className={`pointer-events-none absolute z-20 -translate-x-1/2 whitespace-nowrap rounded-lg border border-outline-variant bg-surface-container-high px-2.5 py-1.5 text-xs font-medium text-on-surface shadow-lg ${tooltipBelow ? "translate-y-1" : "-translate-y-full"}`}
              style={{ left: tooltipLeft, top: tooltipBelow ? points[hover][1] + 6 : points[hover][1] - 8 }}
            >
              {labels?.[hover] ? `${labels[hover]}: ` : ""}
              <span className="font-mono">{valueFormatter(data[hover], hover)}</span>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
