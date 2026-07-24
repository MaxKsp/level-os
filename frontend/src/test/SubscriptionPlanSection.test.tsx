import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { SubscriptionPlanSection } from "../modules/subscription/SubscriptionPlanSection"
import type { SubscriptionPayment, SubscriptionState } from "../modules/subscription/contracts"
import { useSubscription } from "../modules/subscription/store"

vi.mock("../modules/subscription/store", () => ({
  useSubscription: vi.fn(),
}))

const subscription: SubscriptionState = {
  plan: "individual",
  status: "trialing",
  current_period_end: null,
  in_trial: true,
  trial_ends_at: "2026-08-01 12:00:00",
  trial_days_left: 8,
  access: true,
  paid_access: false,
  price_cents: 1990,
}

const payment: SubscriptionPayment = {
  provider: "mercadopago",
  method: "pix",
  external_id: "payment-1",
  status: "pending",
  provider_status: "pending",
  checkout_url: "https://www.mercadopago.com.br/checkout",
  payment_code: "pix-code",
  qr_code_data: "",
  expires_at: "2026-08-01 12:00:00",
  amount_cents: 1990,
  plan: "individual",
  recurring: false,
  test_mode: false,
}

describe("SubscriptionPlanSection", () => {
  it("não reabre automaticamente uma cobrança pendente ao entrar no Perfil", () => {
    vi.mocked(useSubscription).mockReturnValue({
      subscription,
      payment,
      status: "ready",
      error: null,
      paymentBusy: false,
      refresh: vi.fn(),
      startPayment: vi.fn(),
      clearPayment: vi.fn(),
    })

    render(<SubscriptionPlanSection />)

    expect(screen.queryByRole("dialog", { name: "Assinar o Level OS" })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Continuar pagamento" }))

    expect(screen.getByRole("dialog", { name: "Assinar o Level OS" })).toBeInTheDocument()
    expect(screen.getByText("Aguardando pagamento")).toBeInTheDocument()
  })
})
