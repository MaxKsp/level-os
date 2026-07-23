import { useMemo, useState } from "react"
import { cn } from "../../lib/cn"

export interface ParticipationDonutItem {
  label: string
  value: number
  color?: string
}

interface ParticipationDonutProps {
  items: ParticipationDonutItem[]
  formatValue: (value: number) => string
  ariaLabel: string
  className?: string
}

const DEFAULT_COLORS = [
  "var(--color-primary)",
  "color-mix(in srgb, var(--color-primary) 76%, var(--color-on-surface))",
  "color-mix(in srgb, var(--color-primary) 58%, var(--color-surface-container-highest))",
  "color-mix(in srgb, var(--color-primary) 42%, var(--color-outline))",
  "var(--color-outline)",
]

/** Rosca SVG leve com leitura por hover, foco e toque. */
export function ParticipationDonut({ items, formatValue, ariaLabel, className }: ParticipationDonutProps) {
  const normalized = useMemo(() => items.filter((item) => item.value > 0), [items])
  const total = normalized.reduce((sum, item) => sum + item.value, 0)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const activeIndex = previewIndex ?? selectedIndex
  const active = activeIndex === null ? null : normalized[activeIndex]
  const activePercent = active && total > 0 ? (active.value / total) * 100 : 100
  let offset = 0

  if (total <= 0) return <p className="grid min-h-44 place-items-center text-sm text-muted">Sem dados no período.</p>

  return (
    <div className={cn("grid items-center gap-5 sm:grid-cols-[176px_minmax(0,1fr)]", className)}>
      <div className="relative mx-auto size-44">
        <svg viewBox="0 0 120 120" className="size-full -rotate-90" role="img" aria-label={ariaLabel}>
          <circle cx="60" cy="60" r="45" fill="none" stroke="var(--color-surface-container-highest)" strokeWidth="13" />
          {normalized.map((item, index) => {
            const percentage = (item.value / total) * 100
            const segmentOffset = offset
            offset += percentage
            return (
              <circle
                key={item.label}
                cx="60"
                cy="60"
                r="45"
                pathLength="100"
                fill="none"
                stroke={item.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                strokeWidth={activeIndex === index ? 15 : 13}
                strokeDasharray={`${Math.max(percentage - 0.7, 0)} ${100 - Math.max(percentage - 0.7, 0)}`}
                strokeDashoffset={-segmentOffset}
                className="cursor-pointer outline-none transition-[opacity,stroke-width] duration-150 focus:opacity-100 motion-reduce:transition-none"
                opacity={activeIndex === null || activeIndex === index ? 1 : 0.35}
                tabIndex={0}
                role="button"
                aria-label={`${item.label}: ${formatValue(item.value)}, ${percentage.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
                onMouseEnter={() => setPreviewIndex(index)}
                onMouseLeave={() => setPreviewIndex(null)}
                onFocus={() => setPreviewIndex(index)}
                onBlur={() => setPreviewIndex(null)}
                onPointerDown={() => setSelectedIndex(index)}
                onClick={() => setSelectedIndex(index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    setSelectedIndex(index)
                  }
                }}
              >
                <title>{item.label}: {formatValue(item.value)} · {percentage.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</title>
              </circle>
            )
          })}
        </svg>
        <div className="pointer-events-none absolute inset-7 grid place-content-center text-center">
          <span className="truncate text-xs text-muted">{active?.label ?? "Total"}</span>
          <span className="mt-1 font-mono text-sm font-semibold text-on-surface">{formatValue(active?.value ?? total)}</span>
          <span className="mt-0.5 font-mono text-[10px] text-muted">{activePercent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</span>
        </div>
      </div>
      <ul className="min-w-0 divide-y divide-outline-variant">
        {normalized.map((item, index) => {
          const percentage = (item.value / total) * 100
          return (
            <li key={item.label}>
              <button type="button" onClick={() => setSelectedIndex((current) => current === index ? null : index)} onMouseEnter={() => setPreviewIndex(index)} onMouseLeave={() => setPreviewIndex(null)} onFocus={() => setPreviewIndex(index)} onBlur={() => setPreviewIndex(null)} className="flex min-h-11 w-full items-center gap-3 py-2 text-left">
                <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: item.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length] }} />
                <span className="min-w-0 flex-1 truncate text-sm text-on-surface-variant">{item.label}</span>
                <span className="shrink-0 text-right font-mono text-xs text-muted">{percentage.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
