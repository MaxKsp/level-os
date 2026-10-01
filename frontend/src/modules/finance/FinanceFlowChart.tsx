import { useMemo, useState } from "react"
import { cn } from "../../lib/cn"
import { formatCurrency } from "../../lib/format"
import "./FinanceFlowChart.css"

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
    <div className="finance-flow-chart" aria-label={ariaLabel}>
      <div className="finance-flow-head">
        <div className="finance-flow-legend">
          <Legend tone="finance-flow-income" label="Receitas" />
          <Legend tone="finance-flow-expense" label="Despesas" />
        </div>
        <p className="finance-flow-hint">Toque ou use Tab para detalhar</p>
      </div>

      <div className="finance-flow-scroll">
        <div
          className="finance-flow-bars"
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
                className={cn("finance-flow-period", active === index && "is-active")}
              >
                <span className="finance-flow-columns" aria-hidden="true">
                  <span className="finance-flow-column finance-flow-income" style={{ height: incomeHeight }} />
                  <span className="finance-flow-column finance-flow-expense" style={{ height: expenseHeight }} />
                </span>
                <span className="finance-flow-label">{point.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className={cn("finance-flow-detail", activePoint && "is-active")} aria-live="polite">
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
  return <span><span className={cn("finance-flow-dot", tone)} />{label}</span>
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="finance-flow-metric"><p className="finance-flow-metric-label">{label}</p><p className={cn("numeric-value finance-flow-metric-value", tone)}>{formatCurrency(value)}</p></div>
}
