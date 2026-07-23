import { useEffect, useMemo, useState } from "react"
import { AnimatedNumber } from "../../components/ui/AnimatedNumber"
import { Badge, Icon, SectionCard, Sparkline } from "../../design-system"
import { cn } from "../../lib/cn"
import { formatCurrency } from "../../lib/format"
import { CATEGORY_LABEL } from "./categories"
import type { FinanceBootstrap } from "./contracts"
import { expenseRanking, expenseTimeline, expenseTotal, previousExpenseRange, type ExpenseGroupView } from "./expenseAnalytics"
import { FinancePeriodFilter, type FinancePeriodOption } from "./FinancePeriodFilter"
import { resolveFinancePeriod, toLocalIso, type FinancePeriodPreset } from "./period"
import type { FinanceSyncStatus } from "./store"

const EXPENSE_PERIODS: FinancePeriodOption[] = [
  { value: "month", label: "Mês atual" },
  { value: "previous-month", label: "Mês anterior" },
  { value: "3m", label: "3 meses" },
  { value: "6m", label: "6 meses" },
  { value: "12m", label: "12 meses" },
]

export function FinanceExpenses({ data, syncStatus, syncError }: { data: FinanceBootstrap; syncStatus: FinanceSyncStatus; syncError: string | null }) {
  const now = useMemo(() => new Date(), [])
  const [preset, setPreset] = useState<FinancePeriodPreset>("month")
  const [customStart, setCustomStart] = useState(toLocalIso(new Date(now.getFullYear(), now.getMonth(), 1)))
  const [customEnd, setCustomEnd] = useState(toLocalIso(now))
  const [view, setView] = useState<ExpenseGroupView>("category")
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const range = useMemo(() => resolveFinancePeriod(preset, customStart, customEnd, now), [customEnd, customStart, now, preset])
  const previousRange = useMemo(() => previousExpenseRange(range), [range])
  const total = useMemo(() => expenseTotal(data.expense_lines_v4, range), [data.expense_lines_v4, range])
  const previousTotal = useMemo(() => expenseTotal(data.expense_lines_v4, previousRange), [data.expense_lines_v4, previousRange])
  const ranking = useMemo(() => expenseRanking(data.expense_lines_v4, data.accounts_v2, range, view), [data.accounts_v2, data.expense_lines_v4, range, view])
  const timeline = useMemo(() => expenseTimeline(data.expense_lines_v4, range), [data.expense_lines_v4, range])
  const comparison = previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : null
  const selected = ranking.find((item) => item.key === selectedKey) ?? ranking[0]

  useEffect(() => {
    if (!ranking.some((item) => item.key === selectedKey)) setSelectedKey(ranking[0]?.key ?? null)
  }, [ranking, selectedKey])

  if (syncStatus === "loading") return <ExpensesLoading />
  if (syncStatus === "error" && data.expense_lines_v4.length === 0) {
    return <div role="alert" className="border-y border-error/40 py-8 text-center"><Icon name="cloud_off" className="text-2xl text-error" /><p className="mt-2 text-sm font-medium text-on-surface">Não foi possível carregar seus gastos.</p><p className="mt-1 text-xs text-muted">{syncError ?? "Tente novamente em instantes."}</p></div>
  }

  return (
    <div className="space-y-5">
      <FinancePeriodFilter
        preset={preset}
        range={range}
        customStart={customStart}
        customEnd={customEnd}
        onPresetChange={setPreset}
        onCustomStartChange={setCustomStart}
        onCustomEndChange={setCustomEnd}
        options={EXPENSE_PERIODS}
        title="Período dos gastos"
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,.72fr)_minmax(0,1.28fr)]">
        <section className="flex min-h-56 flex-col justify-between border-y border-outline-variant py-5" aria-labelledby="expense-total-title">
          <div>
            <p id="expense-total-title" className="text-sm text-muted">Total gasto</p>
            <p className="mt-3 font-mono text-[clamp(2.4rem,5vw,4rem)] font-semibold leading-none tracking-tight text-on-surface"><AnimatedNumber value={total} animationKey="finance-expenses-total" formatValue={formatCurrency} /></p>
            <p className="mt-2 text-sm text-muted">{range.label}</p>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {comparison === null ? <Badge tone="neutral">Sem base anterior</Badge> : (
              <Badge tone={comparison <= 0 ? "positive" : "warning"}>
                <Icon name={comparison <= 0 ? "south_east" : "north_east"} className="text-[15px]" />
                <AnimatedNumber value={Math.abs(comparison)} animationKey="finance-expenses-comparison" formatValue={(value) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`} /> vs. anterior
              </Badge>
            )}
            <span className="text-xs text-muted">Anterior: <AnimatedNumber value={previousTotal} animationKey="finance-expenses-previous" formatValue={formatCurrency} /></span>
          </div>
        </section>

        <SectionCard title="Evolução dos gastos" description="Soma mensal no intervalo" className="min-w-0">
          {timeline.some((point) => point.total > 0) ? (
            <div className="pt-2"><Sparkline values={timeline.map((point) => point.total)} labels={timeline.map((point) => point.label)} tone="primary" height={150} ariaLabel={`Gastos por mês em ${range.label}`} /><div className="mt-2 flex justify-between text-[10px] text-muted">{timeline.map((point) => <span key={point.key}>{point.label}</span>)}</div></div>
          ) : <EmptyExpenses message="Nenhum lançamento neste período." />}
        </SectionCard>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
        <SectionCard
          title="Onde você mais gastou"
          description={`${ranking.length} ${view === "category" ? "categorias" : "contas"}`}
          bodyClassName="p-0"
          action={<ViewToggle value={view} onChange={setView} />}
        >
          {ranking.length === 0 ? <EmptyExpenses message="Sem gastos para montar o ranking." /> : (
            <ol className="divide-y divide-outline-variant">
              {ranking.map((item, index) => (
                <li key={item.key}>
                  <button type="button" onClick={() => setSelectedKey(item.key)} aria-pressed={selected?.key === item.key} className={cn("group w-full px-4 py-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-primary", selected?.key === item.key ? "bg-primary/8" : "hover:bg-surface-container") }>
                    <div className="flex items-center gap-3">
                      <span className="w-5 shrink-0 font-mono text-xs text-muted">{String(index + 1).padStart(2, "0")}</span>
                      <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><span className="truncate text-sm font-medium capitalize text-on-surface">{view === "category" ? CATEGORY_LABEL[item.key] ?? item.label : item.label}</span><AnimatedNumber value={item.total} animationKey={`finance-expenses-rank-${view}-${item.key}`} formatValue={formatCurrency} className="shrink-0 text-right text-sm text-on-surface" /></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container-highest"><div className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none" style={{ width: `${item.percentage}%` }} /></div><p className="mt-1 text-[11px] text-muted"><span className="numeric-value">{item.percentage.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% · {item.count}</span> lançamentos</p></div>
                    </div>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </SectionCard>

        <SectionCard title={selected ? (view === "category" ? CATEGORY_LABEL[selected.key] ?? selected.label : selected.label) : "Detalhamento"} description={selected ? `${selected.count} lançamentos · ${formatCurrency(selected.total)}` : "Selecione um grupo"} bodyClassName="p-0">
          {!selected ? <EmptyExpenses message="Selecione um item do ranking." /> : (
            <ul className="divide-y divide-outline-variant">
              {selected.expenses.map((expense) => {
                const account = data.accounts_v2.find((item) => item.id === expense.accountId)
                return <li key={expense.id} className="flex items-center justify-between gap-4 px-4 py-3.5"><div className="min-w-0"><p className="truncate text-sm font-medium text-on-surface">{expense.label}</p><p className="mt-0.5 truncate text-xs text-muted">{expense.date ? new Date(`${expense.date}T12:00:00`).toLocaleDateString("pt-BR") : "Sem data"} · {account?.label ?? "Sem conta"}</p></div><span className="shrink-0 font-mono text-sm text-error">− {formatCurrency(expense.value)}</span></li>
              })}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  )
}

function ViewToggle({ value, onChange }: { value: ExpenseGroupView; onChange: (value: ExpenseGroupView) => void }) {
  return <div className="flex rounded-md border border-outline-variant p-0.5" role="group" aria-label="Agrupar gastos"><button type="button" aria-pressed={value === "category"} onClick={() => onChange("category")} className={cn("rounded px-2 py-1 text-[10px] font-medium", value === "category" ? "bg-primary text-on-primary" : "text-muted")}>Categoria</button><button type="button" aria-pressed={value === "account"} onClick={() => onChange("account")} className={cn("rounded px-2 py-1 text-[10px] font-medium", value === "account" ? "bg-primary text-on-primary" : "text-muted")}>Conta</button></div>
}

function EmptyExpenses({ message }: { message: string }) {
  return <div className="grid min-h-40 place-items-center px-5 py-8 text-center"><div><Icon name="receipt_long" className="text-2xl text-muted" /><p className="mt-2 text-sm text-muted">{message}</p></div></div>
}

function ExpensesLoading() {
  return <div aria-busy="true" aria-label="Carregando gastos" className="space-y-5"><div className="h-16 animate-pulse rounded-lg bg-surface-container" /><div className="grid gap-5 lg:grid-cols-2"><div className="h-56 animate-pulse rounded-lg bg-surface-container" /><div className="h-56 animate-pulse rounded-lg bg-surface-container" /></div></div>
}
