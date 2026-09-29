import { useMemo } from "react"
import { Link } from "react-router-dom"
import { AlertCircle, ArrowUpRight, CalendarClock, Landmark, WalletCards } from "lucide-react"
import { SectionCard } from "../../design-system"
import { formatCurrency } from "../../lib/format"
import { CATEGORY_LABEL } from "./categories"
import type { FinanceBootstrap } from "./contracts"
import { financeControl } from "./financeControl"

export function FinanceControlCenter({ data, today }: { data: FinanceBootstrap; today: string }) {
  const control = useMemo(() => financeControl(data, today), [data, today])
  const maxExpense = Math.max(1, ...control.heatmap.map((item) => item.amount))
  return <section aria-label="Central financeira" className="grid gap-4 lg:grid-cols-6">
    <div className="lg:col-span-6">
      <SectionCard title="Central de controle financeiro" description="Pendências reais de cadastro, calendário informado e patrimônio estimado" bodyClassName="p-0">
        <div className="grid divide-y divide-outline-variant sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="p-4"><AlertCircle className="size-5 text-primary" /><p className="mt-4 text-2xl font-semibold tabular-nums text-on-surface">{control.unlinked.length}</p>
            <p className="mt-1 text-xs font-semibold text-on-surface">Lançamentos sem conta válida</p><p className="mt-1 text-[11px] text-muted">Despesas que precisam de revisão de vínculo.</p></div>
          <div className="p-4"><CalendarClock className="size-5 text-primary" /><p className="mt-4 text-2xl font-semibold tabular-nums text-on-surface">{control.dueCards.length}</p>
            <p className="mt-1 text-xs font-semibold text-on-surface">Cartões nos próximos 14 dias</p><p className="mt-1 text-[11px] text-muted">Datas de vencimento e faturas informadas.</p></div>
          <div className="p-4"><Landmark className="size-5 text-primary" /><p className="mt-4 break-words text-xl font-semibold tabular-nums text-on-surface">{formatCurrency(control.summary.netWorth)}</p>
            <p className="mt-1 text-xs font-semibold text-on-surface">Patrimônio calculado</p><p className="mt-1 text-[11px] text-muted">Saldo das contas + reservas − faturas cadastradas.</p></div>
        </div>
      </SectionCard>
    </div>
    <div className="lg:col-span-3">
      <SectionCard title="Revisão de vínculos" description="Etapa preparatória da conciliação com o extrato" bodyClassName="p-0">
        {control.unlinked.length || control.missingDates.length ? <div>
          <ul className="divide-y divide-outline-variant">
            {control.unlinked.slice(0, 4).map((expense) => <li key={expense.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0"><p className="truncate text-xs font-semibold text-on-surface">{expense.label}</p><p className="mt-1 text-[11px] text-muted">{expense.date ?? "Sem data"} · conta não vinculada</p></div>
              <span className="shrink-0 text-xs tabular-nums text-on-surface">{formatCurrency(expense.value)}</span>
            </li>)}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant px-4 py-3 text-[11px] text-muted">
            <span>{control.missingDates.length} lançamento(s) avulso(s) sem data válida</span>
            <Link to="/financeiro?tab=extrato" className="inline-flex min-h-9 items-center gap-1 font-semibold text-primary hover:underline">Consultar extrato <ArrowUpRight className="size-3.5" /></Link>
          </div>
        </div> : <p className="p-5 text-sm text-on-surface-variant">Nenhuma despesa sem conta válida ou sem data encontrada.</p>}
        <p className="border-t border-outline-variant px-4 py-3 text-[11px] leading-5 text-muted">Este painel identifica cadastros a revisar; não atesta conciliação bancária ou pagamento.</p>
      </SectionCard>
    </div>
    <div className="lg:col-span-3">
      <SectionCard title="Vencimentos de cartão" description="Próximas datas com faturas informadas" bodyClassName="p-0">
        {control.dueCards.length ? <ul className="divide-y divide-outline-variant">
          {control.dueCards.map(({ card, date }) => <li key={card.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0"><p className="truncate text-xs font-semibold text-on-surface">{card.label}</p><p className="mt-1 text-[11px] text-muted">Dia cadastrado: {new Date(date + "T12:00:00").toLocaleDateString("pt-BR")}</p></div>
            <span className="shrink-0 text-xs font-semibold tabular-nums text-on-surface">{formatCurrency(card.fatura)}</span>
          </li>)}
        </ul> : <p className="p-5 text-sm text-muted">Nenhum cartão com fatura informada e vencimento nos próximos 14 dias.</p>}
        <p className="border-t border-outline-variant px-4 py-3 text-[11px] leading-5 text-muted">Vencimentos são calculados do dia configurado; consulte a instituição para confirmar o ciclo e o valor devido.</p>
      </SectionCard>
    </div>
    <div className="lg:col-span-6">
      <SectionCard title="Mapa de atividade financeira" description="Despesas com data explícita nos últimos 28 dias — sem projetar recorrências" icon={<WalletCards className="size-5 text-primary" />}>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,.42fr)] sm:items-center">
          <div>
            <div className="grid grid-cols-7 gap-1.5" role="img" aria-label="Mapa dos valores de despesas lançadas por dia nos últimos 28 dias">
              {control.heatmap.map((entry) => <div key={entry.date}
                title={entry.date + " · " + entry.count + " lançamento(s) · " + formatCurrency(entry.amount)}
                className="relative aspect-[1.55] overflow-hidden rounded border border-outline-variant bg-surface-container">
                {entry.amount > 0 ? <span aria-hidden="true" className="absolute inset-0 bg-primary" style={{ opacity: Math.max(.16, entry.amount / maxExpense * .8) }} /> : null}
              </div>)}
            </div>
            <p className="mt-2 text-[11px] text-muted">Cada célula representa uma data. Quanto mais intensa, maior o valor lançado.</p>
          </div>
          <div className="border-t border-outline-variant pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
            <p className="text-xs font-semibold text-on-surface">Concentração do mês</p>
            {control.topCategory ? <><p className="mt-2 text-2xl font-semibold tabular-nums text-on-surface">{control.topCategory.share}%</p>
              <p className="mt-1 text-xs text-on-surface-variant">{CATEGORY_LABEL[control.topCategory.category] ?? control.topCategory.category}</p>
              <p className="mt-1 text-[11px] text-muted">{formatCurrency(control.topCategory.amount)} em despesas datadas deste mês.</p></>
              : <p className="mt-3 text-xs text-muted">Sem despesas datadas no mês.</p>}
          </div>
        </div>
      </SectionCard>
    </div>
  </section>
}
