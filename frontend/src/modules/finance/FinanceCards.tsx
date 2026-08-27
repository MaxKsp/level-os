import type { Key, ReactNode } from "react"
import { CalendarClock, CircleAlert, Pencil, ReceiptText, Trash2 } from "lucide-react"
import { BankLogo } from "../../components/ui/BankLogo"
import { Button } from "../../components/ui/button"
import { ConfirmIconAction, IconAction } from "../../components/ui/IconAction"
import { PersistentCollapsibleSection } from "../../components/ui/PersistentCollapsibleSection"
import { EmptyState } from "../../design-system"
import { cn } from "../../lib/cn"
import { formatCurrency } from "../../lib/format"
import { buildCardBillingSummary, type CardBillingView } from "./cardBilling"
import type { AccountV2, FinanceBootstrap } from "./contracts"

const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })

function formatDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number)
  return shortDate.format(new Date(year, month - 1, day)).replace(".", "")
}

function itemLabel(count: number, singular: string, plural: string): string {
  return `${count.toLocaleString("pt-BR")} ${count === 1 ? singular : plural}`
}

interface FinanceCardsProps {
  data: FinanceBootstrap
  onAdd: () => void
  onEdit: (card: AccountV2) => void
  onDelete: (cardId: string) => void
  referenceDate?: Date
}

export function FinanceCards({ data, onAdd, onEdit, onDelete, referenceDate = new Date() }: FinanceCardsProps) {
  const summary = buildCardBillingSummary(data, referenceDate)
  const cardsById = new Map(data.accounts_v2.map((account) => [account.id, account]))

  return (
    <PersistentCollapsibleSection
      storageKey="level-os:finance:cards-open"
      title="Cartões de crédito"
      description={`${summary.cards.length} cadastrados · fatura informada ${formatCurrency(summary.totalInformedInvoice)} · limite ${formatCurrency(summary.totalInformedLimit)}`}
      defaultOpen={false}
      bodyClassName="p-0"
    >
      {summary.cards.length === 0 ? (
        <EmptyState
          title="Nenhum cartão cadastrado"
          description="Adicione um cartão para acompanhar limite, fechamento e fatura."
          icon="credit_card"
          action={<Button size="sm" onClick={onAdd}>Adicionar cartão</Button>}
        />
      ) : (
        <ul className="divide-y divide-outline-variant">
          {summary.cards.map((billing) => {
            const card = cardsById.get(billing.cardId)
            if (!card) return null
            return <CardBillingItem key={card.id} card={card} billing={billing} onEdit={() => onEdit(card)} onDelete={() => onDelete(card.id)} />
          })}
        </ul>
      )}
    </PersistentCollapsibleSection>
  )
}

function CardBillingItem({ card, billing, onEdit, onDelete }: { card: AccountV2; billing: CardBillingView; onEdit: () => void; onDelete: () => void; key?: Key }) {
  const fillPercentage = Math.min(100, Math.max(0, billing.usagePercentage ?? 0))
  const usageTone = billing.overLimit > 0 || (billing.usagePercentage ?? 0) >= 80
    ? "bg-error"
    : (billing.usagePercentage ?? 0) >= 50
      ? "bg-warning"
      : "bg-tertiary"
  const meterMax = Math.max(1, billing.informedLimit, billing.informedInvoice)

  return (
    <li className="px-3 py-5 sm:px-5" data-card-id={card.id}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
        <BankLogo bank={card.bank} size={40} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-on-surface">{card.label}</p>
          <p className="mt-0.5 truncate text-xs text-muted">
            Fecha dia {card.fechamento ?? "não informado"} · vence dia {card.vencimento ?? "não informado"}
          </p>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <IconAction label="Editar" onClick={onEdit}><Pencil className="size-4" aria-hidden="true" /></IconAction>
          <ConfirmIconAction
            label="Excluir"
            title={`Excluir “${card.label}”?`}
            description="Os dados deste cartão serão removidos do painel. Esta ação não pode ser desfeita."
            onConfirm={onDelete}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </ConfirmIconAction>
        </div>
      </div>

      <div className="mt-4 grid overflow-hidden rounded-xl border border-outline-variant bg-surface-container sm:grid-cols-3">
        <BillingMetric label="Fatura atual informada" value={billing.informedInvoice} />
        <BillingMetric label="Disponível calculado" value={billing.availableCredit} />
        <BillingMetric label="Limite informado" value={billing.informedLimit} />
      </div>

      <div className="mt-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-muted">
            {billing.usagePercentage === null ? "Uso indisponível sem limite informado" : <><span className="numeric-value text-on-surface-variant">{billing.usagePercentage}%</span> do limite informado</>}
          </span>
          {billing.overLimit > 0 ? <span className="font-medium text-error">Excedente {formatCurrency(billing.overLimit)}</span> : null}
        </div>
        {billing.usagePercentage !== null ? (
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-surface-container-highest"
            role="meter"
            aria-label={`Uso do limite de ${card.label}`}
            aria-valuemin={0}
            aria-valuemax={meterMax}
            aria-valuenow={Math.max(0, billing.informedInvoice)}
            aria-valuetext={`${formatCurrency(billing.informedInvoice)} de ${formatCurrency(billing.informedLimit)}`}
          >
            <div className={cn("level-progress-fill h-full rounded-full", usageTone)} style={{ width: `${fillPercentage}%` }} />
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <EstimateCard icon={<ReceiptText className="size-4" aria-hidden="true" />} title="Após fechamento · estimativa">
          {billing.afterClosing ? (
            <>
              <strong className="numeric-value text-base text-on-surface">{formatCurrency(billing.afterClosing.amount)}</strong>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {itemLabel(billing.afterClosing.count, "lançamento", "lançamentos")} entre <time dateTime={billing.afterClosing.fromDate}>{formatDate(billing.afterClosing.fromDate)}</time> e <time dateTime={billing.afterClosing.toDate}>{formatDate(billing.afterClosing.toDate)}</time>.
              </p>
              {billing.afterClosing.uncertainOnClosingDay.count > 0 ? (
                <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-warning">
                  <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  {itemLabel(billing.afterClosing.uncertainOnClosingDay.count, "lançamento no dia do fechamento ficou", "lançamentos no dia do fechamento ficaram")} fora da soma porque o horário de corte é desconhecido.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-xs leading-relaxed text-muted">Informe o dia de fechamento para estimar quais lançamentos podem entrar no próximo ciclo.</p>
          )}
        </EstimateCard>

        <EstimateCard icon={<CalendarClock className="size-4" aria-hidden="true" />} title="Parcelas futuras · estimativa">
          <strong className="numeric-value text-base text-on-surface">{formatCurrency(billing.futureInstallments.amount)}</strong>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {billing.futureInstallments.count > 0
              ? <>{itemLabel(billing.futureInstallments.count, "parcela futura", "parcelas futuras")}{billing.futureInstallments.nextDate ? <> · próxima em <time dateTime={billing.futureInstallments.nextDate}>{formatDate(billing.futureInstallments.nextDate)}</time></> : null}.</>
              : "Nenhuma parcela futura pelas datas cadastradas."}
          </p>
        </EstimateCard>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted">Estimativas são exibidas separadamente e não são somadas à fatura ou descontadas do limite.</p>
    </li>
  )
}

function BillingMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-b border-outline-variant px-3 py-3 last:border-b-0 sm:border-b-0 sm:border-l sm:first:border-l-0">
      <p className="text-[10px] uppercase tracking-[.08em] text-muted">{label}</p>
      <p className="numeric-value mt-1 text-sm font-semibold text-on-surface">{formatCurrency(value)}</p>
    </div>
  )
}

function EstimateCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container/45 p-3">
      <h3 className="mb-2 flex items-center gap-2 text-xs font-medium text-on-surface-variant"><span className="text-primary">{icon}</span>{title}</h3>
      {children}
    </section>
  )
}
