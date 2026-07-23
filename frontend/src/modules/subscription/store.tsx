import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { createSubscriptionCheckout, hasSubscriptionBackend, loadLatestPayment, loadSubscription } from "./api"
import type { PaymentMethod, SubscriptionPayment, SubscriptionState } from "./contracts"

type LoadStatus = "loading" | "ready" | "error"

interface SubscriptionContextValue {
  subscription: SubscriptionState
  payment: SubscriptionPayment | null
  status: LoadStatus
  error: string | null
  paymentBusy: boolean
  refresh: () => Promise<void>
  startPayment: (method: PaymentMethod) => Promise<void>
  clearPayment: () => void
}

const LOCAL_PREVIEW: SubscriptionState = {
  plan: "individual",
  status: "active",
  current_period_end: null,
  in_trial: true,
  trial_ends_at: null,
  trial_days_left: 18,
  access: true,
  price_cents: 1990,
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const remote = hasSubscriptionBackend()
  const [subscription, setSubscription] = useState<SubscriptionState>(LOCAL_PREVIEW)
  const [payment, setPayment] = useState<SubscriptionPayment | null>(null)
  const [status, setStatus] = useState<LoadStatus>(remote ? "loading" : "ready")
  const [error, setError] = useState<string | null>(null)
  const [paymentBusy, setPaymentBusy] = useState(false)

  const refresh = useCallback(async () => {
    if (!remote) return
    try {
      const [nextSubscription, nextPayment] = await Promise.all([loadSubscription(), loadLatestPayment()])
      setSubscription(nextSubscription)
      setPayment((current) => {
        if (nextPayment) return nextPayment
        if (current?.status === "pending" && !nextSubscription.in_trial && nextSubscription.access) {
          return { ...current, status: "paid", provider_status: "approved" }
        }
        return current
      })
      setStatus("ready")
      setError(null)
    } catch (cause) {
      setStatus("error")
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar a assinatura.")
    }
  }, [remote])

  useEffect(() => {
    if (!remote) return
    let active = true
    Promise.all([loadSubscription(), loadLatestPayment()])
      .then(([nextSubscription, nextPayment]) => {
        if (!active) return
        setSubscription(nextSubscription)
        setPayment(nextPayment)
        setStatus("ready")
        setError(null)
      })
      .catch((cause) => {
        if (!active) return
        setStatus("error")
        setError(cause instanceof Error ? cause.message : "Não foi possível carregar a assinatura.")
      })
    return () => { active = false }
  }, [remote])

  useEffect(() => {
    if (!remote || payment?.status !== "pending") return
    const timer = window.setInterval(() => { void refresh() }, 5_000)
    return () => window.clearInterval(timer)
  }, [payment?.status, refresh, remote])

  const startPayment = useCallback(async (method: PaymentMethod) => {
    if (!remote) {
      setError("Configure as credenciais do Mercado Pago no backend para abrir o checkout real.")
      return
    }
    setPaymentBusy(true)
    setError(null)
    try {
      setPayment(await createSubscriptionCheckout(method))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível iniciar o pagamento.")
    } finally {
      setPaymentBusy(false)
    }
  }, [remote])

  const value = useMemo<SubscriptionContextValue>(() => ({
    subscription,
    payment,
    status,
    error,
    paymentBusy,
    refresh,
    startPayment,
    clearPayment: () => setPayment(null),
  }), [error, payment, paymentBusy, refresh, startPayment, status, subscription])

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
}

export function useSubscription(): SubscriptionContextValue {
  const value = useContext(SubscriptionContext)
  if (!value) throw new Error("useSubscription precisa estar dentro de SubscriptionProvider")
  return value
}
