import { useState } from "react"
import { Button } from "../../components/ui/Button"
import { Icon, SectionCard } from "../../design-system"
import { cn } from "../../lib/cn"
import { formatCurrency } from "../../lib/format"
import { SubscriptionCheckoutModal } from "./SubscriptionCheckoutModal"
import { useSubscription } from "./store"

export function SubscriptionPlanSection() {
  const { subscription, payment, status, error, paymentBusy, startPayment, clearPayment } = useSubscription()
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  const currentLabel = subscription.in_trial
    ? `Período grátis · ${subscription.trial_days_left} ${subscription.trial_days_left === 1 ? "dia restante" : "dias restantes"}`
    : subscription.access ? "Plano Individual" : "Período encerrado"

  return (
    <section id="plan" className="scroll-mt-24" aria-labelledby="plan-title">
      <SectionCard
        title="Plano e assinatura"
        description="Um plano mensal para todos os módulos, com pagamento hospedado pelo Mercado Pago"
        icon={<Icon name="workspace_premium" className="text-[20px] text-primary" />}
      >
        <div className="space-y-5">
          <div className="flex flex-col justify-between gap-3 border-y border-outline-variant py-4 sm:flex-row sm:items-center">
            <div>
              <p id="plan-title" className="text-sm font-semibold text-on-surface">{currentLabel}</p>
              <p className="mt-1 text-xs text-muted">
                {subscription.current_period_end
                  ? `Acesso pago até ${new Date(`${subscription.current_period_end.replace(" ", "T")}Z`).toLocaleDateString("pt-BR")}`
                  : subscription.trial_ends_at
                    ? `Trial até ${new Date(`${subscription.trial_ends_at.replace(" ", "T")}Z`).toLocaleDateString("pt-BR")}`
                    : "O Level OS nunca captura número de cartão ou CVV."}
              </p>
            </div>
            <span className={cn(
              "inline-flex w-fit items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium",
              subscription.access ? "bg-tertiary/10 text-tertiary" : "bg-warning/10 text-warning",
            )}>
              <Icon name={subscription.access ? "verified" : "schedule"} className="text-[15px]" />
              {subscription.access ? "Acesso liberado" : "Aguardando assinatura"}
            </span>
          </div>

          {subscription.in_trial || !subscription.access ? (
            <div className="flex flex-col justify-between gap-4 border-b border-outline-variant pb-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm text-muted">Individual</p>
                <p className="numeric-value mt-1 text-2xl font-semibold text-on-surface">{formatCurrency(subscription.price_cents / 100)}<span className="ml-1 font-sans text-xs font-normal text-muted">/mês</span></p>
                <p className="mt-1 text-xs text-muted">Finanças, rotina, treinos e progresso em uma conta.</p>
              </div>
              <Button
                className="min-w-44"
                disabled={paymentBusy || status === "loading"}
                onClick={() => setCheckoutOpen(true)}
              >
                <Icon name="payments" className="text-[18px]" />
                {payment?.status === "pending" ? "Continuar pagamento" : "Escolher pagamento"}
              </Button>
            </div>
          ) : (
            <p className="text-xs leading-5 text-muted">A renovação é confirmada somente pelo webhook assinado do Mercado Pago. O navegador nunca decide seu plano.</p>
          )}
          {error ? <p role="alert" className="text-sm text-error">{error}</p> : null}
        </div>
      </SectionCard>

      <SubscriptionCheckoutModal
        open={checkoutOpen}
        payment={payment}
        busy={paymentBusy}
        error={error}
        onStart={startPayment}
        onChangeMethod={clearPayment}
        onClose={() => {
          setCheckoutOpen(false)
          if (payment?.status === "paid") clearPayment()
        }}
      />
    </section>
  )
}
