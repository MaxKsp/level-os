import { describe, expect, it } from "vitest"
import type { AccountV2, ExpenseLineV4, FinanceBootstrap } from "./contracts"
import { buildCardBillingSummary } from "./cardBilling"

const card = (overrides: Partial<AccountV2> = {}): AccountV2 => ({
  id: "card-1", label: "Cartão teste", tipo: "cartao", saldo: 0, chequeEspecial: 0,
  limite: 5_000, fatura: 1_200, fechamento: 10, vencimento: 20,
  bank: null, principal: false, createdAt: null, ...overrides,
})

const expense = (id: string, value: number, date: string | null, overrides: Partial<ExpenseLineV4> = {}): ExpenseLineV4 => ({
  id, label: id, value, date, time: null, recorrencia: "none", categoria: null,
  method: "credito", bank: null, accountId: "card-1", parcelas: null, createdAt: null, ...overrides,
})

const bootstrap = (accounts: AccountV2[], expenses: ExpenseLineV4[]): FinanceBootstrap => ({
  accounts_v2: accounts, expense_lines_v4: expenses, income_lines: [], "ifood-entries": [],
  vaults: [], transfers: [], acc_view: "conta", bank_favorites: [],
})

describe("cardBilling", () => {
  it("separa fatura informada, pós-fechamento e parcelas futuras sem dupla contagem", () => {
    const data = bootstrap([card()], [
      expense("compra", 100.10, "2026-08-12"),
      expense("parcelada", 200.20, "2026-08-15", { parcelas: 3 }),
      expense("corte-incerto", 50.05, "2026-08-10"),
    ])
    const summary = buildCardBillingSummary(data, new Date(2026, 7, 20, 12))
    const view = summary.cards[0]

    expect(view).toMatchObject({
      informedInvoice: 1_200,
      informedLimit: 5_000,
      availableCredit: 3_800,
      usagePercentage: 24,
      afterClosing: { amount: 300.3, count: 2, fromDate: "2026-08-11", toDate: "2026-08-20" },
      futureInstallments: { amount: 400.4, count: 2, nextDate: "2026-09-15" },
    })
    expect(view.afterClosing?.uncertainOnClosingDay).toEqual({ amount: 50.05, count: 1 })
    expect(summary.totalInformedInvoice).toBe(1_200)
    expect(summary.totalAfterClosingEstimate).toBe(300.3)
    expect(summary.totalFutureInstallments).toBe(400.4)
  })

  it("trata o próprio dia do fechamento como corte incerto e limita dia 31 em fevereiro", () => {
    const data = bootstrap([card({ fechamento: 31 })], [
      expense("antes", 20, "2027-02-27"),
      expense("no-corte", 30, "2027-02-28"),
    ])
    const view = buildCardBillingSummary(data, new Date(2027, 1, 28, 18)).cards[0]

    expect(view.afterClosing).toMatchObject({ amount: 20, count: 1, fromDate: "2027-02-01", toDate: "2027-02-27" })
    expect(view.afterClosing?.uncertainOnClosingDay).toEqual({ amount: 30, count: 1 })
  })

  it("não fabrica estimativa após fechamento quando o dia não foi informado", () => {
    const view = buildCardBillingSummary(
      bootstrap([card({ fechamento: null })], [expense("parcelada", 90, "2026-08-15", { parcelas: 2 })]),
      new Date(2026, 7, 20),
    ).cards[0]

    expect(view.afterClosing).toBeNull()
    expect(view.futureInstallments).toEqual({ amount: 90, count: 1, nextDate: "2026-09-15" })
  })

  it("calcula disponível por cartão e preserva uso acima do limite", () => {
    const data = bootstrap([
      card({ id: "card-1", limite: 100, fatura: 150 }),
      card({ id: "card-2", limite: 100, fatura: 50 }),
    ], [])
    const summary = buildCardBillingSummary(data, new Date(2026, 7, 20))

    expect(summary.cards[0]).toMatchObject({ availableCredit: 0, overLimit: 50, usagePercentage: 150 })
    expect(summary.cards[1]).toMatchObject({ availableCredit: 50, overLimit: 0, usagePercentage: 50 })
    expect(summary.totalAvailableCredit).toBe(50)
  })
})
