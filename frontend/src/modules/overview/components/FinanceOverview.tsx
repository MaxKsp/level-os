import { Link } from "react-router-dom"
import { AnimatedNumber } from "../../../components/ui/AnimatedNumber"
import { BankLogo } from "../../../components/ui/BankLogo"
import { Badge, Icon, SectionCard, Sparkline } from "../../../design-system"
import { formatCurrency, formatSignedCurrency } from "../../../lib/format"
import type { AccountV2, FinanceBootstrap } from "../../finance/contracts"
import { financeSummary, isCard } from "../../finance/selectors"

interface FinanceOverviewProps {
  data: FinanceBootstrap
  trend: { month: string; value: number }[]
  /** Quando definido, mostra o cabeçalho "Finanças" + link. Omitir na página
   *  de Finanças (que já tem H1 próprio) evita link redundante. */
  detailsHref?: string
}

/** Tipo de conta → rótulo + ícone (diferencia conta/poupança/cartão/carteira). */
function accountType(account: AccountV2): { label: string; icon: string } {
  switch (account.tipo) {
    case "cartao":
      return { label: "Cartão de crédito", icon: "credit_card" }
    case "poupanca":
      return { label: "Poupança", icon: "savings" }
    case "carteira":
      return { label: "Carteira digital", icon: "wallet" }
    default:
      return { label: "Conta corrente", icon: "account_balance_wallet" }
  }
}

export function FinanceOverview({ data, trend, detailsHref }: FinanceOverviewProps) {
  const summary = financeSummary(data)
  const trendValues = trend.map((t) => t.value)
  const trendDelta =
    trendValues.length > 1
      ? trendValues[trendValues.length - 1] - trendValues[0]
      : 0

  return (
    <section aria-labelledby="finance-title">
      {detailsHref ? (
        <div className="mb-4 flex items-center justify-between">
          <h2 id="finance-title" className="text-lg font-semibold text-on-surface">
            Finanças
          </h2>
          <Link
            to={detailsHref}
            className="rounded text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
          >
            Abrir financeiro
          </Link>
        </div>
      ) : null}

      <div className="grid border-y border-outline-variant py-4 sm:grid-cols-3">
        <OverviewMetric
          label="Saldo total"
          value={summary.totalBalance}
          animationKey="overview-balance"
          note={`${summary.accountsCount} contas`}
          icon="paid"
          tone="text-tertiary"
        />
        <OverviewMetric
          label="Fatura total"
          value={summary.totalInvoice}
          animationKey="overview-invoice"
          note={`${summary.cardsCount} cartões`}
          icon="credit_card"
          tone="text-warning"
        />
        <OverviewMetric
          label="Crédito disponível"
          value={summary.availableCredit}
          animationKey="overview-credit"
          note="Limite − fatura"
          icon="credit_score"
          tone="text-tertiary"
        />
      </div>

      <div className="mt-7 grid grid-cols-1 items-stretch gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
        <article className="level-chart-card flex min-h-[390px] min-w-0 flex-col border-t border-outline-variant pt-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted">Patrimônio líquido</p>
              <p className="mt-3 font-mono text-[clamp(2.6rem,5.4vw,4.8rem)] font-medium leading-none tracking-[-0.07em] text-on-surface">
                <AnimatedNumber value={summary.netWorth} animationKey="overview-net-worth" formatValue={formatCurrency} />
              </p>
              <p className="mt-3 text-sm text-muted">Saldos + reservas − faturas</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-outline-variant bg-surface-container px-2.5 py-1 text-[10px] font-medium text-muted">6 meses</span>
              <Badge tone={trendDelta >= 0 ? "positive" : "warning"}>
                <Icon name={trendDelta >= 0 ? "trending_up" : "trending_down"} className="text-[16px]" />
                {formatSignedCurrency(trendDelta)}
              </Badge>
            </div>
          </div>

          <div className="flex flex-1 flex-col justify-end py-3">
            <Sparkline values={trendValues} tone="primary" height={190} labels={trend.map((t) => t.month)} ariaLabel="Tendência do patrimônio líquido nos últimos 6 meses" />
            <div className="mt-2 flex justify-between px-1 text-[11px] text-muted">
              {trend.map((t, index) => <span key={`${t.month}-${index}`}>{t.month}</span>)}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 border-y border-outline-variant">
            <ChartMetric label="Disponível" value={summary.totalBalance} animationKey="overview-chart-balance" />
            <ChartMetric label="Reservas" value={summary.totalVaults} animationKey="overview-chart-vaults" />
            <ChartMetric label="Faturas" value={summary.totalInvoice} animationKey="overview-chart-invoice" tone="text-error" />
          </div>
        </article>

        <SectionCard title="Contas e cartões" description="Saldos e faturas atuais" className="h-full min-w-0" bodyClassName="p-0">
          <ul className="divide-y divide-outline-variant">
            {data.accounts_v2.slice(0, 4).map((account) => {
              const card = isCard(account)
              const type = accountType(account)
              return (
                <li
                  key={account.id}
                  className="level-data-row flex items-center gap-3 px-1 py-3.5 transition-colors hover:bg-surface-container"
                >
                  <BankLogo bank={account.bank} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-on-surface">
                      {account.label}
                    </p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted">
                      <Icon name={type.icon} className="text-[13px]" />
                      {type.label}
                      {account.principal ? " · Principal" : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <AnimatedNumber value={card ? account.fatura : account.saldo} animationKey={`overview-account-${account.id}`} formatValue={formatCurrency} className="text-right text-sm text-on-surface" />
                    <p className="text-xs text-muted">
                      {card ? "fatura" : "saldo"}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
          {data.accounts_v2.length > 4 ? (
            <Link to="/financeiro" className="block border-t border-outline-variant px-1 py-3 text-center text-xs font-medium text-primary hover:bg-surface-container">
              Ver mais {data.accounts_v2.length - 4} contas
            </Link>
          ) : null}
        </SectionCard>
      </div>
    </section>
  )
}

function ChartMetric({ label, value, animationKey, tone = "text-on-surface" }: { label: string; value: number; animationKey: string; tone?: string }) {
  return (
    <div className="min-w-0 border-l border-outline-variant px-3 py-3 first:border-l-0">
      <p className="truncate text-xs text-muted">{label}</p>
      <AnimatedNumber value={value} animationKey={animationKey} formatValue={formatCurrency} className={`mt-1 max-w-full truncate text-right text-xs font-semibold ${tone}`} />
    </div>
  )
}

function OverviewMetric({ label, value, animationKey, note, icon, tone }: { label: string; value: number; animationKey: string; note: string; icon: string; tone: string }) {
  return (
    <article className="level-metric-cell min-w-0 border-t border-outline-variant px-1 py-4 first:border-t-0 sm:border-l sm:border-t-0 sm:px-5 sm:first:border-l-0">
      <div className="flex items-center gap-2">
        <Icon name={icon} className={`text-[18px] ${tone}`} />
        <p className="truncate text-xs text-muted">{label}</p>
      </div>
      <AnimatedNumber value={value} animationKey={animationKey} formatValue={formatCurrency} className="mt-3 max-w-full truncate text-right text-xl font-semibold text-on-surface" />
      <p className="mt-1 truncate text-xs text-muted">{note}</p>
    </article>
  )
}
