import type { PaymentMethod, PaymentStatus, SubscriptionPayment, SubscriptionState } from "./contracts"

export function hasSubscriptionBackend(): boolean {
  return typeof window !== "undefined" && Boolean(window.CSRF_TOKEN)
}

const ERROR_MESSAGES: Record<string, string> = {
  payment_email_required: "Adicione um e-mail válido ao perfil antes de assinar.",
  payment_unavailable: "O Mercado Pago está indisponível no momento. Tente novamente em alguns minutos.",
  payment_configuration_invalid: "Não foi possível iniciar o checkout. A configuração do Mercado Pago precisa ser revisada.",
  subscription_already_active: "Seu plano Individual já está ativo.",
  csrf: "Sua sessão expirou. Atualize a página e tente novamente.",
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const body = await response.json().catch(() => null)
  if (!response.ok || !body || typeof body !== "object") {
    const code = body && typeof body === "object" && "error" in body ? String(body.error) : `http_${response.status}`
    throw new Error(ERROR_MESSAGES[code] ?? "Não foi possível concluir a solicitação.")
  }
  return body as Record<string, unknown>
}

export async function loadSubscription(): Promise<SubscriptionState> {
  const body = await readJson(await fetch("/api/subscription.php", {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  }))
  return {
    plan: body.plan === "individual" ? "individual" : "free",
    status: typeof body.status === "string" ? body.status : "active",
    current_period_end: typeof body.current_period_end === "string" ? body.current_period_end : null,
    in_trial: body.in_trial === true,
    trial_ends_at: typeof body.trial_ends_at === "string" ? body.trial_ends_at : null,
    trial_days_left: Number.isFinite(Number(body.trial_days_left)) ? Math.max(0, Number(body.trial_days_left)) : 0,
    access: body.access === true,
    paid_access: body.paid_access === true,
    price_cents: Number.isFinite(Number(body.price_cents)) ? Math.max(0, Math.round(Number(body.price_cents))) : 1990,
  }
}

function normalizeStatus(value: unknown): PaymentStatus {
  const status = typeof value === "string" ? value.toLowerCase() : "pending"
  if (status === "paid" || status === "expired" || status === "cancelled") return status
  return "pending"
}

function parsePayment(value: unknown): SubscriptionPayment | null {
  if (!value || typeof value !== "object") return null
  const payment = value as Record<string, unknown>
  if (payment.provider !== "mercadopago") return null
  if (payment.method !== "pix" && payment.method !== "card") return null
  if (typeof payment.external_id !== "string" || payment.external_id.length === 0) return null
  if (typeof payment.checkout_url !== "string") return null
  if (payment.checkout_url !== "" && !payment.checkout_url.startsWith("https://")) return null
  return {
    provider: "mercadopago",
    method: payment.method,
    external_id: payment.external_id,
    status: normalizeStatus(payment.status),
    provider_status: typeof payment.provider_status === "string" ? payment.provider_status : null,
    checkout_url: payment.checkout_url,
    payment_code: typeof payment.payment_code === "string" ? payment.payment_code : "",
    qr_code_data: typeof payment.qr_code_data === "string" ? payment.qr_code_data : "",
    expires_at: typeof payment.expires_at === "string" ? payment.expires_at : null,
    amount_cents: Math.max(0, Math.round(Number(payment.amount_cents) || 0)),
    plan: "individual",
    recurring: payment.recurring === true,
    test_mode: payment.test_mode === true,
  }
}

export async function loadLatestPayment(): Promise<SubscriptionPayment | null> {
  const body = await readJson(await fetch("/api/subscription-checkout.php", {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  }))
  return parsePayment(body.payment)
}

export async function createSubscriptionCheckout(method: PaymentMethod): Promise<SubscriptionPayment> {
  const body = await readJson(await fetch("/api/subscription-checkout.php", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": window.CSRF_TOKEN ?? "",
    },
    body: JSON.stringify({ plan: "individual", method }),
  }))
  const payment = parsePayment(body.payment)
  if (!payment) throw new Error("O servidor devolveu um checkout inválido.")
  return payment
}
