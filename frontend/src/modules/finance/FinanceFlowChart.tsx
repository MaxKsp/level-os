import { useMemo, useState } from "react"
import { cn } from "../../lib/cn"
import { formatCurrency } from "../../lib/format"

export interface FinanceFlowPoint {
  key: string
  label: string
  income: number
  expenses: number
}

interface FinanceFlowChartProps {
  points: FinanceFlowPoint[]
  ariaLabel: string
}

export function FinanceFlowChart({ points, ariaLabel }: FinanceFlowChartProps) {
  const [active, setActive] = useState<number | null>(null)
  const max = useMemo(
    () => Math.max(1, ...points.flatMap((point) => [point.income, point.expenses])),
    [points],
  )
  const activePoint = active === null ? null : points[active]

  if (points.length === 0) {
    return <p className="grid min-h-40 place-items-center text-sm text-muted">Sem dados no período.</p>
  }

  return (
    <div className="min-w-0" aria-label={ariaLabel}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-xs text-muted">
          <Legend tone="bg-tertiary" label="Receitas" />
          <Legend tone="bg-error" label="Despesas" />
        </div>
        <p className="text-[11px] text-muted">Toque ou use Tab para detalhar</p>
      </div>

      <div className="overflow-x-auto overscroll-x-contain pb-2">
        <div
          className="grid min-w-[560px] items-end gap-2 border-b border-outline-variant px-1 pt-5"
          style={{ gridTemplateColumns: `repeat(${points.length}, minmax(40px, 1fr))` }}
          role="list"
        >
          {points.map((point, index) => {
            const incomeHeight = Math.max(point.income > 0 ? 8 : 2, (point.income / max) * 132)
            const expenseHeight = Math.max(point.expenses > 0 ? 8 : 2, (point.expenses / max) * 132)
            return (
              <button
                key={point.key}
                type="button"
                role="listitem"
                onFocus={() => setActive(index)}

                onBlur={() => setActive(null)}
                onPointerEnter={() => setActive(index)}
                onPointerLeave={() => setActive(null)}
                onClick={() => setActive((current) => current === index ? null : index)}
                aria-label={`${point.label}: receitas ${formatCurrency(point.income)}, despesas ${formatCurrency(point.expenses)}`}
                className={cn(
                  "group flex min-h-[178px] min-w-0 flex-col justify-end rounded-t-lg px-1 pb-2 outline-none transition-colors",
                  active === index ? "bg-primary/[0.06]" : "hover:bg-surface-container/70",
                  "focus-visible:ring-2 focus-visible:ring-primary/45",
                )}
              >
                <span className="flex h-[136px] items-end justify-center gap-1.5" aria-hidden="true">
                  <span
                    className="w-[38%] rounded-t-md bg-tertiary/85 transition-[height,opacity] duration-300 motion-reduce:transition-none"
                    style={{ height: incomeHeight }}
                  />
                  <span
                    className="w-[38%] rounded-t-md bg-error/80 transition-[height,opacity] duration-300 motion-reduce:transition-none"
                    style={{ height: expenseHeight }}
                  />
                </span>
                <span className="mt-2 truncate text-[10px] font-medium capitalize text-muted group-hover:text-on-surface">
                  {point.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div
        className={cn(
          "mt-3 grid min-h-[66px] grid-cols-2 gap-2 rounded-xl border border-outline-variant bg-surface-container/65 p-3 transition-opacity",
          activePoint ? "opacity-100" : "opacity-75",
        )}
        aria-live="polite"
      >
        <Metric
          label={activePoint ? `Receitas · ${activePoint.label}` : "Receitas"}
          value={activePoint?.income ?? points.reduce((sum, point) => sum + point.income, 0)}
          tone="text-tertiary"
        />
        <Metric
          label={activePoint ? `Despesas · ${activePoint.label}` : "Despesas"}
          value={activePoint?.expenses ?? points.reduce((sum, point) => sum + point.expenses, 0)}
          tone="text-error"
        />
      </div>
    </div>
  )
}

function Legend({ tone, label }: { tone: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={cn("size-2 rounded-full", tone)} />{label}</span>
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="min-w-0"><p className="truncate text-[10px] uppercase tracking-[.08em] text-muted">{label}</p><p className={cn("numeric-value mt-1 truncate text-sm font-semibold", tone)}>{formatCurrency(value)}</p></div>
}
