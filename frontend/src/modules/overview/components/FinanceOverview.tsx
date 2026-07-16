import { Badge, Icon, SectionCard, Sparkline, StatCard } from "../../../design-system"
import { formatCurrency, formatSignedCurrency } from "../../../lib/format"
import type { FinanceBootstrap } from "../../finance/contracts"
import { financeSummary, isCard } from "../../finance/selectors"

interface FinanceOverviewProps {
  data: FinanceBootstrap
  trend: { month: string; value: number }[]
}

export function FinanceOverview({ data, trend }: FinanceOverviewProps) {
  const summary = financeSummary(data)
  const trendValues = trend.map((t) => t.value)
  const trendDelta =
    trendValues.length > 1
      ? trendValues[trendValues.length - 1] - trendValues[0]
      : 0

  return (
    <section aria-labelledby="finance-title">
      <div className="mb-4 flex items-center justify-between">
        <h2 id="finance-title" className="text-lg font-semibold text-on-surface">
          Finanças
        </h2>
        <a
          href="#finance"
          className="text-sm font-medium text-primary hover:text-on-surface"
        >
          Ver detalhes
        </a>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Patrimônio líquido"
          value={formatCurrency(summary.netWorth)}
          note="Saldos + cofrinhos − faturas"
          icon="account_balance"
          dot="primary"
        />
        <StatCard
          label="Saldo total"
          value={formatCurrency(summary.totalBalance)}
          note={`${summary.accountsCount} contas`}
          icon="savings"
          dot="positive"
        />
        <StatCard
          label="Fatura total"
          value={formatCurrency(summary.totalInvoice)}
          note={`${summary.cardsCount} cartões`}
          icon="credit_card"
          dot="warning"
        />
        <StatCard
          label="Crédito disponível"
          value={formatCurrency(summary.availableCredit)}
          note="Limite − fatura"
          icon="credit_score"
          dot="positive"
        />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-5">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="text-sm text-on-surface-variant">
                Patrimônio líquido
              </p>
              <p className="mt-1 font-mono text-2xl font-medium text-on-surface">
                {formatCurrency(summary.netWorth)}
              </p>
            </div>
            <Badge tone={trendDelta >= 0 ? "positive" : "warning"}>
              <Icon
                name={trendDelta >= 0 ? "trending_up" : "trending_down"}
                className="text-[16px]"
              />
              {formatSignedCurrency(trendDelta)}
            </Badge>
          </div>
          <Sparkline
            values={trendValues}
            tone="primary"
            className="h-20 w-full"
            ariaLabel="Tendência do patrimônio líquido nos últimos 6 meses"
          />
          <div className="mt-2 flex justify-between text-xs text-muted">
            {trend.map((t) => (
              <span key={t.month}>{t.month}</span>
            ))}
          </div>
        </div>

        <SectionCard title="Contas e cartões" bodyClassName="p-0">
          <ul className="divide-y divide-outline-variant">
            {data.accounts_v2.map((account) => {
              const card = isCard(account)
              return (
                <li
                  key={account.id}
                  className="flex items-center gap-3 px-5 py-3.5"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-container-high text-on-surface-variant">
                    <Icon
                      name={card ? "credit_card" : "account_balance_wallet"}
                      className="text-[18px]"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-on-surface">
                      {account.label}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {account.bank ?? "—"}
                      {account.principal ? " · Principal" : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm text-on-surface">
                      {formatCurrency(card ? account.fatura : account.saldo)}
                    </p>
                    <p className="text-xs text-muted">
                      {card ? "fatura" : "saldo"}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        </SectionCard>
      </div>
    </section>
  )
}
