import { useMemo, useState } from "react"
import { Button } from "../../components/ui/Button"
import { AnimatedNumber } from "../../components/ui/AnimatedNumber"
import { BankLogo } from "../../components/ui/BankLogo"
import { Icon, SectionCard } from "../../design-system"
import { cn } from "../../lib/cn"
import { formatCurrency } from "../../lib/format"
import type { FinanceBootstrap } from "./contracts"
import { CATEGORY_LABEL } from "./categories"
import { buildAnnualTaxData } from "./annualTax"

const ACCOUNT_LABEL: Record<string, string> = {
  conta: "Conta corrente",
  poupanca: "Poupança",
  pagamento: "Conta de pagamento",
  carteira: "Carteira digital",
  cartao: "Cartão de crédito",
}

export function AnnualTaxReport({ data }: { data: FinanceBootstrap }) {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const report = useMemo(() => buildAnnualTaxData(year, data), [data, year])
  const incomeRows = [
    ["Renda fixa", report.incomeByType.fixed],
    ["Renda variável cadastrada", report.incomeByType.registeredVariable],
    ["Renda temporária", report.incomeByType.temporary],
    ["Renda variável lançada", report.incomeByType.actualVariable],
  ] as const

  return (
    <div className="flex flex-col gap-4">
      <div className="level-tax-controls flex flex-col justify-between gap-3 rounded-2xl border border-outline-variant bg-surface-container-low p-4 sm:flex-row sm:items-center">
        <div>
          <p className="flex items-center gap-2 font-semibold text-on-surface"><Icon name="receipt_long" className="text-[20px] text-primary" />Imposto de Renda</p>
          <p className="mt-0.5 text-sm text-muted">Relatório financeiro anual recuperado da versão anterior do Level OS.</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="tax-year" className="text-sm text-on-surface-variant">Ano</label>
          <select id="tax-year" value={year} onChange={(event) => setYear(Number(event.target.value))} className="rounded-xl border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary">
            {Array.from({ length: 6 }, (_, index) => currentYear - index).map((option) => <option key={option}>{option}</option>)}
          </select>
          <Button variant="secondary" onClick={() => window.print()}><Icon name="print" className="text-[18px]" />Imprimir / PDF</Button>
        </div>
      </div>

      <section className="level-tax-report flex flex-col gap-4" aria-label={`Relatório financeiro de ${year}`}>
        <header className="flex flex-col gap-1 rounded-2xl border border-outline-variant bg-surface-container-low px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-medium text-primary">Level OS · informe financeiro</p><h2 className="mt-1 text-2xl font-semibold text-on-surface">Relatório anual {year}</h2></div>
          <p className="text-xs text-muted">Gerado em {new Date().toLocaleDateString("pt-BR")}</p>
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          <TaxMetric label="Rendimentos estimados" value={report.annualIncome} tone="text-tertiary" />
          <TaxMetric label="Despesas registradas" value={report.annualExpenses} tone="text-error" />
          <TaxMetric label="Resultado do ano" value={report.annualBalance} tone={report.annualBalance >= 0 ? "text-primary" : "text-error"} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="Composição dos rendimentos" description="Estimativa baseada nos meses ativos" bodyClassName="p-0">
            <div className="divide-y divide-outline-variant">
              {incomeRows.map(([label, value]) => <ReportRow key={label} label={label} value={value} />)}
              <ReportRow label="Total" value={report.annualIncome} strong />
            </div>
          </SectionCard>

          <SectionCard title="Despesas por categoria" description={`${report.expensesByCategory.length} categorias`} bodyClassName="p-0">
            {report.expensesByCategory.length ? (
              <div className="divide-y divide-outline-variant">
                {report.expensesByCategory.map((item) => <ReportRow key={item.category} label={CATEGORY_LABEL[item.category] ?? item.category} value={item.total} />)}
                <ReportRow label="Total" value={report.annualExpenses} strong />
              </div>
            ) : <p className="p-6 text-center text-sm text-muted">Nenhuma despesa registrada neste ano.</p>}
          </SectionCard>
        </div>

        <SectionCard title="Movimento mês a mês" description="Entradas, saídas e saldo estimado" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left text-sm">
              <thead className="border-b border-outline-variant text-xs text-muted"><tr><th className="px-4 py-3">Mês</th><th className="px-4 py-3 text-right">Entradas</th><th className="px-4 py-3 text-right">Saídas</th><th className="px-4 py-3 text-right">Saldo</th></tr></thead>
              <tbody className="divide-y divide-outline-variant">
                {report.months.map((month) => <tr key={month.label}><td className="px-4 py-2.5 font-medium text-on-surface">{month.label}</td><td className="px-4 py-2.5 text-right font-mono text-tertiary">{formatCurrency(month.income)}</td><td className="px-4 py-2.5 text-right font-mono text-error">{formatCurrency(month.expenses)}</td><td className={cn("px-4 py-2.5 text-right font-mono", month.balance >= 0 ? "text-on-surface" : "text-error")}>{formatCurrency(month.balance)}</td></tr>)}
              </tbody>
              <tfoot className="border-t border-outline bg-surface-container font-semibold"><tr><td className="px-4 py-3">Ano</td><td className="px-4 py-3 text-right font-mono">{formatCurrency(report.annualIncome)}</td><td className="px-4 py-3 text-right font-mono">{formatCurrency(report.annualExpenses)}</td><td className="px-4 py-3 text-right font-mono">{formatCurrency(report.annualBalance)}</td></tr></tfoot>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Contas e cartões" description="Posição atual, não o fechamento do ano" bodyClassName="p-0">
          {data.accounts_v2.length ? (
            <ul className="divide-y divide-outline-variant">
              {data.accounts_v2.map((account) => (
                <li key={account.id} className="flex items-center gap-3 px-4 py-3">
                  <BankLogo bank={account.bank} size={34} />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-on-surface">{account.label}</p><p className="text-xs text-muted">{ACCOUNT_LABEL[account.tipo] ?? account.tipo}</p></div>
                  <p className="font-mono text-sm text-on-surface">{formatCurrency(account.tipo === "cartao" ? account.fatura : account.saldo)}</p>
                </li>
              ))}
            </ul>
          ) : <p className="p-6 text-center text-sm text-muted">Nenhuma conta cadastrada.</p>}
        </SectionCard>

        <p className="rounded-xl border border-warning/25 bg-warning/8 px-4 py-3 text-xs leading-relaxed text-on-surface-variant"><strong className="text-warning">Atenção:</strong> este relatório organiza os dados cadastrados no Level OS e não substitui informes de rendimentos, notas fiscais ou orientação contábil. Rendas recorrentes são estimadas ao longo dos meses ativos.</p>
      </section>
    </div>
  )
}

function TaxMetric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="border-l border-outline-variant px-4 py-3"><p className="text-sm text-muted">{label}</p><AnimatedNumber value={value} animationKey={`tax-metric-${label}`} formatValue={formatCurrency} className={cn("mt-2 block text-right text-xl font-semibold", tone)} /></div>
}

function ReportRow({ label, value, strong = false }: { key?: string; label: string; value: number; strong?: boolean }) {
  return <div className={cn("flex items-center justify-between gap-4 px-4 py-3 text-sm", strong && "bg-surface-container font-semibold")}><span className="text-on-surface-variant">{label}</span><span className="font-mono text-on-surface">{formatCurrency(value)}</span></div>
}
