import { useState } from "react"
import { Button } from "../../components/ui/Button"
import { Modal } from "../../components/ui/Modal"
import { Icon } from "../../design-system"
import { formatCurrency } from "../../lib/format"
import type { PaymentMethod, SubscriptionPayment } from "./contracts"

interface SubscriptionCheckoutModalProps {
  open: boolean
  payment: SubscriptionPayment | null
  busy: boolean
  error: string | null
  onStart: (method: PaymentMethod) => Promise<void>
  onChangeMethod: () => void
  onClose: () => void
}

export function SubscriptionCheckoutModal({
  open,
  payment,
  busy,
  error,
  onStart,
  onChangeMethod,
  onClose,
}: SubscriptionCheckoutModalProps) {
  const [pixCopied, setPixCopied] = useState(false)
  const pending = payment?.status === "pending"
  const terminal = payment?.status === "expired" || payment?.status === "cancelled"

  const copyPixCode = async () => {
    if (!payment?.payment_code) return
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable")
      await navigator.clipboard.writeText(payment.payment_code)
      setPixCopied(true)
    } catch {
      setPixCopied(false)
      const field = document.getElementById("subscription-pix-code")
      if (field instanceof HTMLTextAreaElement) {
        field.focus()
        field.select()
      }
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Assinar o Level OS"
      description="Escolha Pix ou cartão. O pagamento é processado com segurança pelo Mercado Pago."
      icon="workspace_premium"
      maxWidth="max-w-lg"
    >
      {busy ? (
        <div className="grid min-h-64 place-items-center" aria-busy="true">
          <div className="text-center">
            <span className="mx-auto block size-8 animate-spin rounded-full border-2 border-primary/25 border-t-primary motion-reduce:animate-none" />
            <p className="mt-3 text-sm text-muted">Preparando o checkout seguro…</p>
          </div>
        </div>
      ) : payment?.status === "paid" ? (
        <div className="space-y-5 text-center">
          <div className="border-y border-tertiary/35 py-8">
            <Icon name="verified" className="text-4xl text-tertiary" />
            <p className="mt-3 text-lg font-semibold text-on-surface">Pagamento confirmado</p>
            <p className="mt-1 text-sm text-muted">O plano Individual já está ativo.</p>
          </div>
          <Button className="w-full" onClick={onClose}>Concluir</Button>
        </div>
      ) : pending ? (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3 border-y border-outline-variant py-4">
            <div>
              <p className="text-xs text-muted">Plano Individual · mensal</p>
              <p className="numeric-value mt-1 text-xl font-semibold text-on-surface">
                {formatCurrency(payment.amount_cents / 100)}
              </p>
            </div>
            <span className="rounded-md bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
              Aguardando pagamento
            </span>
          </div>

          <div className="flex gap-3 border-b border-outline-variant pb-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Icon name={payment.method === "pix" ? "qr_code_2" : "credit_card"} className="text-[21px]" />
            </span>
            <div>
              <p className="text-sm font-semibold text-on-surface">
                {payment.method === "pix" ? "Pagamento mensal por Pix" : "Assinatura recorrente no cartão"}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                {payment.method === "pix"
                  ? "O Pix libera 30 dias após a confirmação e não é renovado automaticamente."
                  : "Você confirma a recorrência no Mercado Pago. O Level OS não recebe cartão ou CVV."}
              </p>
            </div>
          </div>

          {payment.method === "pix" ? (
            <div className="space-y-4">
              {payment.test_mode ? (
                <div role="status" className="rounded-lg border border-warning/35 bg-warning/10 p-4">
                  <div className="flex items-start gap-3">
                    <Icon name="science" className="mt-0.5 shrink-0 text-[20px] text-warning" />
                    <div>
                      <p className="text-sm font-semibold text-on-surface">Ambiente de teste</p>
                      <p className="mt-1 text-xs leading-5 text-muted">
                        Este Pix é apenas uma simulação do Mercado Pago e não existe na rede Pix real.
                        Ele não pode ser pago pelo aplicativo de um banco.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
              {!payment.test_mode && payment.qr_code_data ? (
                <img
                  src={`data:image/png;base64,${payment.qr_code_data}`}
                  alt="QR Code Pix para pagamento do plano Individual"
                  className="mx-auto size-48 rounded-lg bg-white p-2"
                />
              ) : null}
              {!payment.test_mode && payment.payment_code ? (
                <div className="space-y-2">
                  <label htmlFor="subscription-pix-code" className="text-xs font-medium text-muted">Pix copia e cola</label>
                  <textarea
                    id="subscription-pix-code"
                    readOnly
                    value={payment.payment_code}
                    onFocus={(event) => event.currentTarget.select()}
                    className="min-h-24 w-full resize-none rounded-lg border border-outline-variant bg-surface-container px-3 py-2 font-mono text-xs leading-5 text-on-surface focus-visible:outline-2 focus-visible:outline-primary"
                  />
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => { void copyPixCode() }}
                  >
                    <Icon name={pixCopied ? "check" : "content_copy"} className="text-[18px]" />
                    {pixCopied ? "Código copiado" : "Copiar código Pix"}
                  </Button>
                </div>
              ) : null}
              {payment.checkout_url ? (
                <a
                  href={payment.checkout_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 text-sm font-medium text-on-surface hover:bg-surface-container-high focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {payment.test_mode ? "Abrir simulação no Mercado Pago" : "Abrir Pix no Mercado Pago"}
                  <Icon name="open_in_new" className="text-[18px]" />
                </a>
              ) : null}
            </div>
          ) : payment.checkout_url ? (
            <a
              href={payment.checkout_url}
              className="level-button level-button--primary flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary shadow-sm focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            >
              Continuar no Mercado Pago
              <Icon name="open_in_new" className="text-[18px]" />
            </a>
          ) : (
            <p role="alert" className="text-sm text-error">O link do checkout não está disponível. Tente criar uma nova cobrança.</p>
          )}
          <p role="status" className="text-center text-xs leading-5 text-muted">
            O plano só é liberado quando o webhook confirma o pagamento. Esta janela consulta o servidor a cada 5 segundos.
          </p>
          {error ? <p role="alert" className="text-sm text-error">{error}</p> : null}
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              setPixCopied(false)
              onChangeMethod()
            }}
          >
            Escolher outra forma de pagamento
          </Button>
          <Button variant="ghost" className="w-full" onClick={onClose}>Fechar e pagar depois</Button>
        </div>
      ) : (
        <div className="space-y-5">
          {terminal ? (
            <p role="status" className="border-y border-warning/30 py-3 text-sm text-warning">
              A cobrança anterior foi encerrada. Gere um novo checkout para continuar.
            </p>
          ) : null}
          <div>
            <p className="text-sm font-semibold text-on-surface">Como você prefere pagar?</p>
            <p className="mt-1 text-xs leading-5 text-muted">O Pix vale por 30 dias. O cartão renova automaticamente todo mês.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <PaymentMethodButton
              icon="qr_code_2"
              title="Pix"
              description="QR Code e copia-e-cola. Renovação manual mensal."
              onClick={() => { void onStart("pix").catch(() => undefined) }}
            />
            <PaymentMethodButton
              icon="credit_card"
              title="Cartão"
              description="Assinatura recorrente no checkout do Mercado Pago."
              onClick={() => { void onStart("card").catch(() => undefined) }}
            />
          </div>
          <div className="flex items-start gap-2 border-t border-outline-variant pt-4 text-xs leading-5 text-muted">
            <Icon name="shield_lock" className="mt-0.5 shrink-0 text-[17px] text-primary" />
            O plano só é ativado depois que o webhook validado confirma um pagamento aprovado.
          </div>
          {error ? <p role="alert" className="text-sm text-error">{error}</p> : null}
        </div>
      )}
    </Modal>
  )
}

function PaymentMethodButton({
  icon,
  title,
  description,
  onClick,
}: {
  icon: string
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-28 rounded-lg border border-outline-variant p-4 text-left transition-colors hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary motion-reduce:transition-none"
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-on-surface">
        <Icon name={icon} className="text-[20px] text-primary" />
        {title}
      </span>
      <span className="mt-2 block text-xs leading-5 text-muted">{description}</span>
    </button>
  )
}
