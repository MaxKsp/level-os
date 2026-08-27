import { useMemo } from "react"
import { ArrowDownRight, ArrowUpRight, Minus, Scale } from "lucide-react"
import { SectionCard } from "../../design-system"
import { cn } from "../../lib/cn"
import { formatCurrency, formatSignedCurrency } from "../../lib/format"
import type { FinanceBootstrap } from "./contracts"
import type { FinanceDateRange } from "./period"
import {
  buildPeriodComparison,
  expenseTone,
  formatDeltaPercentage,
  incomeTone,
  type DeltaResult,
} from "./periodComparison"

const TONE_CLASS = {
  warning: "text-error",
  positive: "text-tertiary",
  neutral: "text-muted",
} as const

function DeltaIcon({ direction }: { direction: DeltaResult["direction"] }) {
  if (direction === "increased" || direction === "new") return <ArrowUpRight className="size-3.5" aria-hidden="true" />
  if (direction === "decreased" || direction === "ended") return <ArrowDownRight className="size-3.5" aria-hidden="true" />
  return <Minus className="size-3.5" aria-hidden="true" />
}

function DeltaMetric({ label, delta, tone }: { label: string; delta: DeltaResult; tone: "warning" | "positive" | "neutral" }) {
  return (
    <div className="border-b border-outline-variant px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-l sm:first:border-l-0">
      <p className="text-xs text-muted">{label}</p>
      <p className="numeric-value mt-1 text-lg font-semibold text-on-surface">{formatCurrency(delta.current)}</p>
      <p className={cn("mt-1 flex items-center gap-1 text-xs font-medium", TONE_CLASS[tone])}>
        <DeltaIcon direction={delta.direction} />
        <span className="numeric-value">{formatSignedCurrency(delta.absolute)}</span>
        <span className="text-muted">· {formatDeltaPercentage(delta)}</span>
      </p>
      <p className="mt-1 text-[11px] text-muted">Anterior <span className="numeric-value">{formatCurrency(delta.previous)}</span></p>
    </div>
  )
}

export function FinancePeriodComparison({ data, range }: { data: FinanceBootstrap; range: FinanceDateRange }) {
  const comparison = useMemo(() => buildPeriodComparison(data, range), [data, range])
  const relevantCategories = comparison.categories.filter((category) => category.absolute !== 0).slice(0, 5)

  return (
    <SectionCard
      title="Comparação com o período anterior"
      description={comparison.comparisonLabel}
      icon={<Scale className="size-5 text-primary" aria-hidden="true" />}
      action={<span className="rounded-md border border-outline-variant px-2.5 py-1 text-[10px] text-muted">{comparison.modeLabel}</span>}
      bodyClassName="p-0"
    >
      <dl className="grid border-y border-outline-variant sm:grid-cols-3" data-testid="period-comparison-metrics">
        <DeltaMetric label="Despesas no período" delta={comparison.expenses} tone={expenseTone(comparison.expenses.direction)} />
        <DeltaMetric label="Entradas no período" delta={comparison.income} tone={incomeTone(comparison.income.direction)} />
        <DeltaMetric label="Resultado" delta={comparison.balance} tone={incomeTone(comparison.balance.direction)} />
      </dl>

      {relevantCategories.length > 0 ? (
        <ul className="divide-y divide-outline-variant">
          {relevantCategories.map((category) => {
            const tone = expenseTone(category.direction)
            return (
              <li key={category.category} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-on-surface">{category.label}</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    <span className="numeric-value">{formatCurrency(category.current)}</span> vs. <span className="numeric-value">{formatCurrency(category.previous)}</span>
                  </p>
                </div>
                <p className={cn("flex shrink-0 items-center gap-1 text-xs font-medium", TONE_CLASS[tone])}>
                  <DeltaIcon direction={category.direction} />
                  <span className="numeric-value">{formatSignedCurrency(category.absolute)}</span>
                  <span className="text-muted">· {formatDeltaPercentage(category)}</span>
                </p>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="px-4 py-5 text-sm text-muted">Nenhuma categoria variou entre os dois intervalos comparados.</p>
      )}

      <p className="border-t border-outline-variant px-4 py-3 text-[11px] leading-relaxed text-muted">
        O intervalo anterior usa o recorte correspondente ao atual e pode ser limitado pelo calendário. Em despesas, aumento é alerta e redução é melhoria; sem base anterior, a variação aparece como “novo” em vez de percentual.
      </p>
    </SectionCard>
  )
}
