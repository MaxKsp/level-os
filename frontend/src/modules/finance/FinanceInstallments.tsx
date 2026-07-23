import { CalendarClock, CircleCheck, CreditCard } from "lucide-react"
import { AnimatedNumber } from "../../components/ui/AnimatedNumber"
import { BankLogo } from "../../components/ui/BankLogo"
import { Skeleton } from "../../components/ui/Skeleton"
import { EmptyState, SectionCard } from "../../design-system"
import { formatCurrency } from "../../lib/format"
import type { FinanceBootstrap } from "./contracts"
import { buildInstallmentSummary } from "./installments"
import type { FinanceSyncStatus } from "./store"

const fullDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" })

function formatDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number)
  return fullDate.format(new Date(year, month - 1, day)).replace(".", "")
}

export function FinanceInstallments({ data, syncStatus, syncError }: { data: FinanceBootstrap; syncStatus: FinanceSyncStatus; syncError: string | null }) {
  if (syncStatus === "loading") return <InstallmentsSkeleton />
  if (syncStatus === "error" && data.expense_lines_v4.length === 0) {
    return <SectionCard title="Parcelamentos" description="Não foi possível carregar os lançamentos"><p role="alert" className="border-y border-error/25 bg-error/5 px-4 py-5 text-sm text-error">{syncError || "Tente novamente em alguns instantes."}</p></SectionCard>
  }

  const summary = buildInstallmentSummary(data)
  if (summary.purchases.length === 0) {
    return <SectionCard title="Parcelamentos" description="Compras distribuídas pelos próximos meses"><EmptyState title="Nenhuma compra parcelada" description="Quando uma despesa tiver duas ou mais parcelas, o progresso e o cronograma aparecerão aqui." icon="calendar_month" /></SectionCard>
  }

  const maxMonth = Math.max(...summary.schedule.map((month) => month.amount), 1)
  return (
    <div className="grid gap-x-8 gap-y-6 lg:grid-cols-5">
      {syncStatus === "error" ? <p role="alert" className="border-y border-warning/30 bg-warning/5 px-4 py-3 text-sm text-on-surface lg:col-span-5">Exibindo os últimos dados disponíveis. {syncError || "A sincronização será tentada novamente."}</p> : null}
      <section className="lg:col-span-5" aria-labelledby="installments-summary-title">
        <div className="grid gap-5 border-y border-outline-variant py-5 sm:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,.6fr))]">
          <div>
            <p id="installments-summary-title" className="text-sm text-muted">Total ainda a quitar</p>
            <AnimatedNumber value={summary.totalRemaining} animationKey="finance-installments-total-remaining" formatValue={formatCurrency} className="mt-2 block text-right text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-none text-on-surface sm:text-left" />
            <p className="mt-2 text-xs text-muted">Estimativa baseada no vencimento mensal de cada parcela.</p>
          </div>
          <Metric label="Compras ativas" value={summary.activePurchases} animationKey="finance-installments-active" />
          <Metric label="Meses projetados" value={summary.schedule.length} animationKey="finance-installments-months" />
        </div>
      </section>

      <div className="lg:col-span-2">
        <SectionCard title="Cronograma mensal" description="Impacto das parcelas futuras" icon={<CalendarClock className="size-5 text-primary" aria-hidden="true" />}>
          {summary.schedule.length === 0 ? <p className="py-8 text-center text-sm text-muted">Todas as compras parceladas estão quitadas.</p> : (
            <ul className="divide-y divide-outline-variant">
              {summary.schedule.map((month) => (
                <li key={month.key} className="py-3.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="capitalize text-on-surface">{month.label}</span>
                    <span className="numeric-value text-right font-medium text-on-surface">{formatCurrency(month.amount)}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container-highest"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, (month.amount / maxMonth) * 100)}%` }} /></div>
                  <p className="mt-1 text-xs text-muted"><span className="numeric-value">{month.installments}</span> {month.installments === 1 ? "parcela" : "parcelas"}</p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="lg:col-span-3">
        <SectionCard title="Compras parceladas" description={`${summary.purchases.length} lançamentos · progresso estimado`} bodyClassName="p-0">
          <ul className="divide-y divide-outline-variant">
            {summary.purchases.map((purchase) => (
              <li key={purchase.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
                {purchase.bank ? <BankLogo bank={purchase.bank} size={38} /> : <span className="grid size-[38px] place-items-center rounded-lg border border-outline-variant bg-surface-container text-primary"><CreditCard className="size-4" aria-hidden="true" /></span>}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-on-surface">{purchase.label}</p>
                    {purchase.completed ? <span className="inline-flex items-center gap-1 rounded bg-tertiary/10 px-1.5 py-0.5 text-[10px] text-tertiary"><CircleCheck className="size-3" aria-hidden="true" /> Quitado</span> : null}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted">{purchase.accountLabel}</p>
                  <p className="mt-2 text-xs text-muted"><span className="numeric-value text-on-surface-variant">{purchase.paidInstallments}/{purchase.totalInstallments}</span> parcelas estimadas como pagas{purchase.nextDate ? <> · próxima em <time dateTime={purchase.nextDate}>{formatDate(purchase.nextDate)}</time></> : ""}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container-highest"><div className="h-full rounded-full bg-primary" style={{ width: `${(purchase.paidInstallments / purchase.totalInstallments) * 100}%` }} /></div>
                </div>
                <dl className="col-start-2 grid grid-cols-3 gap-3 text-right sm:col-start-auto sm:block">
                  <Value label="Total" value={purchase.totalAmount} />
                  <Value label="Parcela" value={purchase.installmentAmount} className="sm:mt-2" />
                  <Value label="Restante" value={purchase.remainingAmount} className="sm:mt-2" />
                </dl>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  )
}

function Metric({ label, value, animationKey }: { label: string; value: number; animationKey: string }) {
  return <div className="border-l border-outline-variant pl-5"><p className="text-sm text-muted">{label}</p><AnimatedNumber value={value} animationKey={animationKey} formatValue={(current) => Math.round(current).toLocaleString("pt-BR")} className="mt-2 block text-right text-2xl font-semibold text-on-surface sm:text-left" /></div>
}

function Value({ label, value, className = "" }: { label: string; value: number; className?: string }) {
  return <div className={className}><dt className="text-[10px] text-muted">{label}</dt><dd className="numeric-value mt-0.5 whitespace-nowrap text-xs font-medium text-on-surface">{formatCurrency(value)}</dd></div>
}

function InstallmentsSkeleton() {
  return <div aria-busy="true" aria-label="Carregando parcelamentos" className="space-y-6"><div className="grid grid-cols-3 gap-4 border-y border-outline-variant py-5"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div><div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-72" /><Skeleton className="h-72" /></div></div>
}
