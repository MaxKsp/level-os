import { describe, expect, it } from "vitest"
import type { AccountV2, ExpenseLineV4 } from "./contracts"
import { expenseRanking, expenseTimeline, expenseTotal, previousExpenseRange } from "./expenseAnalytics"

const expense = (id: string, value: number, date: string, category: string | null, accountId = "checking"): ExpenseLineV4 => ({
  id, label: id, value, date, time: null, recorrencia: "none", categoria: category,
  method: null, bank: null, accountId, parcelas: null, createdAt: null,
})
const accounts: AccountV2[] = [{ id: "checking", label: "Conta principal", tipo: "conta", saldo: 0, chequeEspecial: 0, limite: 0, fatura: 0, fechamento: null, vencimento: null, bank: null, principal: true, createdAt: null }]
const range = { start: "2026-06-01", end: "2026-07-31", label: "jun–jul" }
const expenses = [
  expense("market", 300, "2026-07-10", "mercado"),
  expense("rent", 1_000, "2026-07-05", "moradia"),
  expense("market-2", 200, "2026-06-10", "mercado"),
  expense("old", 9_000, "2026-05-01", "moradia"),
]

describe("análise de gastos", () => {
  it("filtra, soma e ordena o ranking do maior para o menor", () => {
    expect(expenseTotal(expenses, range)).toBe(1_500)
    expect(expenseRanking(expenses, accounts, range, "category").map((item) => [item.key, item.total, Math.round(item.percentage)])).toEqual([
      ["moradia", 1_000, 67],
      ["mercado", 500, 33],
    ])
  })

  it("agrupa pela conta e mantém o drill-down", () => {
    const [group] = expenseRanking(expenses, accounts, range, "account")
    expect(group.label).toBe("Conta principal")
    expect(group.expenses).toHaveLength(3)
  })

  it("cria timeline mensal incluindo meses sem lançamentos", () => {
    expect(expenseTimeline(expenses, { start: "2026-05-01", end: "2026-07-31", label: "" }).map((point) => point.total)).toEqual([9_000, 200, 1_300])
  })

  it("calcula o intervalo anterior com a mesma duração", () => {
    expect(previousExpenseRange({ start: "2026-07-01", end: "2026-07-31", label: "" })).toMatchObject({ start: "2026-06-01", end: "2026-06-30" })
  })
})
