import { describe, expect, it } from "vitest"
import type { FinanceBootstrap } from "./contracts"
import { buildInstallmentSummary, expenseOccurrencesInRange } from "./installments"
import { financeBootstrapMock } from "./mock"

describe("installments", () => {
  it("deriva progresso, saldo restante e cronograma sem inventar novos campos", () => {
    const summary = buildInstallmentSummary(financeBootstrapMock, new Date(2026, 8, 16, 12))
    const notebook = summary.purchases.find((purchase) => purchase.id === "exp-4")

    expect(notebook).toMatchObject({
      installmentAmount: 410.55,
      totalAmount: 2463.3,
      paidInstallments: 3,
      totalInstallments: 6,
      remainingAmount: 1231.65,
      nextDate: "2026-10-15",
    })
    expect(summary.totalRemaining).toBe(1231.65)
    expect(summary.schedule.slice(0, 3).map((month) => month.amount)).toEqual([410.55, 410.55, 410.55])
  })

  it("expande parcelas e recorrências apenas dentro do período", () => {
    const installment = financeBootstrapMock.expense_lines_v4.find((expense) => expense.id === "exp-4")!
    expect(expenseOccurrencesInRange(installment, "2026-08-01", "2026-10-31")).toEqual([
      "2026-08-15",
      "2026-09-15",
      "2026-10-15",
    ])

    const recurring = { ...installment, id: "fixed", date: "2026-06-30", parcelas: null, recorrencia: "mensal" as const }
    expect(expenseOccurrencesInRange(recurring, "2026-07-01", "2026-08-31")).toEqual(["2026-07-30", "2026-08-30"])
  })

  it("retorna vazio quando não há compras parceladas", () => {
    const data: FinanceBootstrap = { ...financeBootstrapMock, expense_lines_v4: [] }
    expect(buildInstallmentSummary(data, new Date(2026, 6, 18))).toMatchObject({ purchases: [], schedule: [], activePurchases: 0, totalRemaining: 0 })
  })
})
