import { useState } from "react"
import { Button } from "../../components/ui/Button"
import { Icon } from "../../design-system"
import { SubscriptionCheckoutModal } from "./SubscriptionCheckoutModal"
import { useSubscription } from "./store"

export function ExpiredPaywall() {
  const { payment, paymentBusy, error, startPayment, clearPayment } = useSubscription()
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  return (
    <main className="level-page mx-auto grid min-h-[calc(100vh-4rem)] max-w-3xl place-items-center px-4 pb-24 pt-24 sm:px-6">
      <section className="w-full border-y border-outline-variant py-10 text-center" aria-labelledby="paywall-title">
        <span className="mx-auto grid size-12 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon name="lock_clock" className="text-2xl" />
        </span>
        <p className="mt-5 text-sm font-medium text-primary">Próximo nível</p>
        <h1 id="paywall-title" className="mt-3 text-3xl font-semibold tracking-tight text-on-surface">Seu período grátis terminou</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted">Assine para voltar a criar e editar finanças, rotinas e treinos. Seus dados continuam seus e podem ser exportados a qualquer momento.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={() => setCheckoutOpen(true)} disabled={paymentBusy}>
            <Icon name="payments" className="text-[18px]" />
            {payment?.status === "pending" ? "Continuar pagamento" : "Assinar plano Individual"}
          </Button>
          <a href="/api/export.php" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 text-sm font-medium text-on-surface hover:bg-surface-container-high focus-visible:outline-2 focus-visible:outline-primary">
            <Icon name="download" className="text-[18px]" />Exportar meus dados
          </a>
          <a href="/logout.php" className="inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-medium text-error focus-visible:outline-2 focus-visible:outline-primary">
            <Icon name="logout" className="text-[18px]" />Sair
          </a>
        </div>
        {error ? <p role="alert" className="mt-4 text-sm text-error">{error}</p> : null}
      </section>

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
    </main>
  )
}
