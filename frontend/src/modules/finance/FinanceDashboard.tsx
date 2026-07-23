import { useMemo, useState } from "react"
import { AnimatedNumber } from "../../components/ui/AnimatedNumber"
import { ParticipationDonut } from "../../components/ui/ParticipationDonut"
import { Icon, SectionCard, Sparkline } from "../../design-system"
import { cn } from "../../lib/cn"
import { formatCurrency, formatSignedCurrency } from "../../lib/format"
import { CATEGORY_LABEL } from "./categories"
import type { FinanceBootstrap } from "./contracts"
import { FinancePeriodFilter } from "./FinancePeriodFilter"
import { financeTotalsForPeriod, financeTrendForPeriod, resolveFinancePeriod, toLocalIso, type FinancePeriodPreset } from "./period"
import { expensesByCategory, financeSummary, isCard } from "./selectors"
import { buildInstallmentSummary } from "./installments"

/** Dashboard analítico. Todos os indicadores, exceto o histórico sinalizado, derivam do store. */
export function FinanceDashboard({ data }: { data: FinanceBootstrap }) {
  const now = useMemo(() => new Date(), [])
  const monthStart = toLocalIso(new Date(now.getFullYear(), now.getMonth(), 1))
  const monthEnd = toLocalIso(new Date(now.getFullYear(), now.getMonth() + 1, 0))
  const [periodPreset, setPeriodPreset] = useState<FinancePeriodPreset>("month")
  const [customStart, setCustomStart] = useState(monthStart)
  const [customEnd, setCustomEnd] = useState(monthEnd)
  const [view, setView] = useState<"focus" | "details">("focus")
  const period = useMemo(
    () => resolveFinancePeriod(periodPreset, customStart, customEnd, now),
    [customEnd, customStart, now, periodPreset],
  )
  const periodTotals = useMemo(() => financeTotalsForPeriod(data, period), [data, period])
  const summary = financeSummary(data)
  const trendPoints = useMemo(
    () => financeTrendForPeriod(data, period, summary.netWorth),
    [data, period, summary.netWorth],
  )
  const trend = trendPoints.map((point) => point.value)
  const labels = trendPoints.map((point) => point.label)
  const delta = trend.length > 1 ? trend.at(-1)! - trend[0] : 0
  const categories = expensesByCategory({ ...data, expense_lines_v4: periodTotals.filteredExpenses })
  const categoryChartItems = [
    ...categories.slice(0, 4).map((category) => ({ label: CATEGORY_LABEL[category.category] ?? category.category, value: category.total })),
    ...(categories.length > 4 ? [{ label: "Outros", value: categories.slice(4).reduce((sum, category) => sum + category.total, 0) }] : []),
  ]
  const cards = data.accounts_v2.filter(isCard)
  const flowMax = Math.max(periodTotals.income, periodTotals.expenses, 1)
  const savingsRate = periodTotals.income > 0 ? (periodTotals.balance / periodTotals.income) * 100 : 0
  const expenseRatio = periodTotals.income > 0
    ? (periodTotals.expenses / periodTotals.income) * 100
    : periodTotals.expenses > 0 ? 100 : 0
  const movementCount = periodTotals.filteredExpenses.length
    + periodTotals.recurringIncomeOccurrences
    + periodTotals.variableIncomeOccurrences
  const installmentProjection = useMemo(() => buildInstallmentSummary(data, now), [data, now])

  return (
    <div className="grid gap-x-8 gap-y-6 lg:grid-cols-6">
      <div className="lg:col-span-6">
        <FinancePeriodFilter
          preset={periodPreset}
          range={period}
          customStart={customStart}
          customEnd={customEnd}
          onPresetChange={setPeriodPreset}
          onCustomStartChange={setCustomStart}
          onCustomEndChange={setCustomEnd}
        />
      </div>

      <div className="lg:col-span-6">
        <SectionCard
          title="Patrimônio em perspectiva"
          description="Variação reconstruída a partir dos lançamentos no período"
          bodyClassName="p-3 sm:p-4"
          action={<span className="numeric-value rounded-md border border-outline-variant px-2.5 py-1 text-[10px] text-muted">{period.label}</span>}
        >
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.32fr)_minmax(320px,.68fr)]">
            <article className="level-finance-hero relative min-w-0 lg:border-r lg:border-outline-variant lg:pr-6">
              <div className="relative z-[1] flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted">Variação no período</p>
                  <p className={cn("mt-2 font-mono text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-none tracking-tight", delta > 0 ? "text-tertiary" : delta < 0 ? "text-error" : "text-on-surface")}>
                    <AnimatedNumber
                      value={delta}
                      startValue={0}
                      animationKey={`finance-dashboard-delta-${period.start}-${period.end}`}
                      formatValue={formatSignedCurrency}
                      aria-label={formatSignedCurrency(delta)}
                    />
                  </p>
                  <p className={cn("mt-2 flex items-center gap-1 text-sm font-medium", delta > 0 ? "text-tertiary" : delta < 0 ? "text-error" : "text-muted")}>
                    <Icon name={delta > 0 ? "north_east" : delta < 0 ? "south_east" : "remove"} className="text-[15px]" />
                    <span className="numeric-value">{period.label}</span>
                  </p>
                  <p className="mt-4 text-xs text-muted">Patrimônio atual <AnimatedNumber value={summary.netWorth} animationKey="finance-dashboard-net-worth-reference" formatValue={formatCurrency} className="ml-1 font-medium text-on-surface-variant" /></p>
                </div>
              </div>

              <div className="relative z-[1] mt-3 min-h-[148px] px-2 pt-2">
                <Sparkline values={trend} labels={labels} height={124} ariaLabel={`Evolução estimada do patrimônio em ${period.label}`} />
                <div className="flex justify-between px-1 text-[9px] text-muted">{labels.map((label, index) => <span className="numeric-value" key={`${trendPoints[index]?.date}-${index}`}>{label}</span>)}</div>
              </div>

              <div className="relative z-[1] mt-3 grid grid-cols-3 gap-2">
                <CompactMetric label="Disponível" value={summary.totalBalance} animationKey="finance-dashboard-balance" />
                <CompactMetric label="Reservas" value={summary.totalVaults} animationKey="finance-dashboard-vaults" />
                <CompactMetric label="Passivos" value={summary.totalInvoice} animationKey="finance-dashboard-invoice" tone="text-error" />
              </div>
            </article>

            <article className="flex min-w-0 flex-col border-t border-outline-variant pt-5 lg:border-t-0 lg:pl-2 lg:pt-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-on-surface">Composição e saúde</p>
                  <p className="mt-0.5 text-xs text-muted">Receitas e despesas · <span className="numeric-value">{period.label}</span></p>
                </div>
              </div>

              <div className="mt-5 border-y border-outline-variant py-4">
                <p className="text-sm text-muted">Saldo gerado</p>
                <p className={cn("mt-1 font-mono text-2xl font-semibold", periodTotals.balance >= 0 ? "text-tertiary" : "text-error")}><AnimatedNumber value={periodTotals.balance} animationKey="finance-dashboard-period-balance" formatValue={formatSignedCurrency} /></p>
                <p className="mt-1 text-xs text-muted"><AnimatedNumber value={movementCount} animationKey="finance-dashboard-movement-count" formatValue={(value) => Math.round(value).toLocaleString("pt-BR")} /> movimentos considerados</p>
              </div>

              <ParticipationDonut
                className="pt-4 sm:grid-cols-[132px_minmax(0,1fr)]"
                ariaLabel={`Composição de receitas e despesas em ${period.label}`}
                formatValue={formatCurrency}
                items={[
                  { label: "Receitas", value: periodTotals.income, color: "var(--color-tertiary)" },
                  { label: "Despesas", value: periodTotals.expenses, color: "var(--color-error)" },
                ]}
              />

              <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
                <HealthMetric icon="shield" label="Taxa de poupança" value={savingsRate} animationKey="finance-dashboard-savings-rate" />
                <HealthMetric icon="payments" label="Comprometimento" value={expenseRatio} animationKey="finance-dashboard-expense-ratio" />
              </div>
            </article>
          </div>
        </SectionCard>
      </div>

      <div className="lg:col-span-6" role="tablist" aria-label="Nível de detalhe do dashboard">
        <div className="inline-flex min-h-11 items-center gap-1 border-b border-outline-variant p-1">
          <button type="button" role="tab" aria-selected={view === "focus"} onClick={() => setView("focus")} className={cn("min-h-10 rounded-md px-4 text-sm font-medium transition-colors", view === "focus" ? "bg-primary/10 text-primary" : "text-muted hover:text-on-surface")}>Foco</button>
          <button type="button" role="tab" aria-selected={view === "details"} onClick={() => setView("details")} className={cn("min-h-10 rounded-md px-4 text-sm font-medium transition-colors", view === "details" ? "bg-primary/10 text-primary" : "text-muted hover:text-on-surface")}>Detalhes</button>
        </div>
      </div>

      {view === "focus" ? <div className="lg:col-span-6">
        <SectionCard className="h-full" title="Fluxo no período" description={<span className="numeric-value">{period.label}</span>}>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(240px,.4fr)] lg:items-end">
            <div className="space-y-4">
              <FlowBar label="Receitas" value={periodTotals.income} max={flowMax} tone="bg-tertiary" text="text-tertiary" />
              <FlowBar label="Despesas" value={periodTotals.expenses} max={flowMax} tone="bg-error" text="text-error" />
            </div>
              <div className="flex items-center justify-between border-y border-outline-variant px-1 py-4">
              <span className="text-sm font-medium text-on-surface">Saldo do período</span>
              <span className={cn("font-mono text-right text-lg font-semibold", periodTotals.balance >= 0 ? "text-tertiary" : "text-error")}><AnimatedNumber value={periodTotals.balance} animationKey="finance-dashboard-flow-balance" formatValue={formatSignedCurrency} /></span>
            </div>
          </div>
        </SectionCard>
      </div> : null}

      {view === "details" ? <div className="lg:col-span-3">
        <SectionCard className="h-full" title="Despesas por categoria" description={<><span className="numeric-value">{categories.length}</span> categorias</>}>
          <ParticipationDonut items={categoryChartItems} formatValue={formatCurrency} ariaLabel={`Participação das despesas por categoria em ${period.label}`} />
        </SectionCard>
      </div> : null}

      {view === "details" && installmentProjection.schedule.length > 0 ? <div className="lg:col-span-6">
        <SectionCard title="Fluxo de parcelas projetado" description={<>Ainda a quitar <span className="numeric-value">{formatCurrency(installmentProjection.totalRemaining)}</span></>}>
          <ul className="grid gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {installmentProjection.schedule.slice(0, 6).map((month) => (
              <li key={month.key} className="flex items-center justify-between gap-4 border-b border-outline-variant py-3">
                <div><p className="capitalize text-sm text-on-surface">{month.label}</p><p className="mt-0.5 text-xs text-muted"><span className="numeric-value">{month.installments}</span> {month.installments === 1 ? "parcela" : "parcelas"}</p></div>
                <span className="numeric-value text-right text-sm font-medium text-on-surface">{formatCurrency(month.amount)}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div> : null}

      {view === "details" ? <div className="lg:col-span-3">
        <SectionCard className="h-full" title="Utilização de crédito" description={<><span className="numeric-value">{cards.length}</span> cartões · <span className="numeric-value">{formatCurrency(summary.availableCredit)}</span> livres</>}>
          {cards.length === 0 ? <EmptyState label="Nenhum cartão cadastrado." /> : (
            <ul className="flex flex-col gap-4">
              {cards.map((card) => {
                const percentage = card.limite > 0 ? Math.min(100, Math.round((card.fatura / card.limite) * 100)) : 0
                return (
                  <li key={card.id}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-on-surface">{card.label}</span>
                      <span className="shrink-0 font-mono text-on-surface-variant">{formatCurrency(card.fatura)} / {formatCurrency(card.limite)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-container-highest">
                      <div className={cn("level-progress-fill h-full rounded-full", percentage >= 80 ? "bg-error" : percentage >= 50 ? "bg-warning" : "bg-tertiary")} style={{ width: `${percentage}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-muted"><span className="numeric-value">{percentage}%</span> usado · livre <span className="numeric-value">{formatCurrency(Math.max(0, card.limite - card.fatura))}</span></p>
                  </li>
                )
              })}
            </ul>
          )}
        </SectionCard>
      </div> : null}

      {view === "details" && data.vaults.length > 0 ? (
        <div className="lg:col-span-6">
          <SectionCard title="Cofrinhos" description={<>Guardado <span className="numeric-value">{formatCurrency(summary.totalVaults)}</span></>}>
            <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {data.vaults.map((vault) => {
                const target = vault.meta ?? 0
                const percentage = target > 0 ? Math.min(100, Math.round((vault.saldo / target) * 100)) : 0
                return (
                  <li key={vault.id}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-1.5 truncate text-on-surface"><Icon name="savings" className="text-[16px] text-tertiary" />{vault.label}</span>
                      <span className="shrink-0 font-mono text-on-surface-variant">{formatCurrency(vault.saldo)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-container-highest"><div className="level-progress-fill h-full rounded-full bg-tertiary" style={{ width: `${percentage}%` }} /></div>
                    <p className="mt-1 text-xs text-muted"><span className="numeric-value">{percentage}%</span> de <span className="numeric-value">{formatCurrency(target)}</span></p>
                  </li>
                )
              })}
            </ul>
          </SectionCard>
        </div>
      ) : null}
    </div>
  )
}

function CompactMetric({ label, value, animationKey, tone = "text-on-surface" }: { label: string; value: number; animationKey: string; tone?: string }) {
  return <div className="min-w-0 border-l border-outline-variant px-3 py-2 text-right first:border-l-0"><p className="truncate text-xs text-muted">{label}</p><AnimatedNumber value={value} animationKey={animationKey} formatValue={formatCurrency} className={cn("mt-1 max-w-full truncate text-sm font-medium", tone)} /></div>
}

function HealthMetric({ icon, label, value, animationKey }: { icon: string; label: string; value: number; animationKey: string }) {
  return <div className="border-l border-outline-variant px-3 py-2.5 first:border-l-0"><span className="flex items-center gap-1.5 text-xs text-muted"><Icon name={icon} className="text-[14px] text-primary" />{label}</span><AnimatedNumber value={value} animationKey={animationKey} formatValue={(current) => `${Math.round(current)}%`} className="mt-1.5 block text-sm font-semibold text-on-surface" /></div>
}

function FlowBar({ label, value, max, tone, text }: { label: string; value: number; max: number; tone: string; text: string }) {
  return <div><div className="mb-1.5 flex items-center justify-between text-sm"><span className="text-on-surface-variant">{label}</span><AnimatedNumber value={value} animationKey={`finance-dashboard-flow-${label.toLocaleLowerCase("pt-BR")}`} formatValue={formatCurrency} className={cn("text-right font-medium", text)} /></div><div className="h-2.5 overflow-hidden rounded-full bg-surface-container-highest"><div className={cn("level-progress-fill h-full rounded-full", tone)} style={{ width: `${(value / max) * 100}%` }} /></div></div>
}

function EmptyState({ label }: { label: string }) {
  return <p className="grid min-h-28 place-items-center text-sm text-muted">{label}</p>
}
