import { describe, expect, it } from "vitest"
import type { FinanceBootstrap } from "./contracts"
import { buildAnnualTaxData } from "./annualTax"

const empty: FinanceBootstrap = {
  accounts_v2: [],
  expense_lines_v4: [],
  income_lines: [],
  "ifood-entries": [],
  vaults: [],
  transfers: [],
  acc_view: "conta",
  bank_favorites: [],
}

describe("buildAnnualTaxData", () => {
  it("calcula recorrências, parcelas, renda temporária e lançamentos variáveis", () => {
    const data: FinanceBootstrap = {
      ...empty,
      expense_lines_v4: [
        { id: "rent", label: "Aluguel", value: 1000, date: "2025-11-05", time: null, recorrencia: "mensal", categoria: "moradia", method: null, bank: null, accountId: null, parcelas: null, createdAt: null },
        { id: "laptop", label: "Notebook", value: 200, date: "2025-11-10", time: null, recorrencia: "mensal", categoria: "eletronicos", method: null, bank: null, accountId: null, parcelas: 6, createdAt: null },
      ],
      income_lines: [
        { id: "salary", label: "Salário", value: 3000, type: "fixa", endDate: null, payday: 5, accountId: null, createdAt: 1_735_689_600 },
        { id: "contract", label: "Contrato", value: 500, type: "temporaria", endDate: "2026-03-15", payday: 10, accountId: null, createdAt: 1_735_689_600 },
      ],
      "ifood-entries": [{ id: "delivery", date: "2026-02-12", valor: 150, km: 20 }],
    }

    const report = buildAnnualTaxData(2026, data)
    expect(report.annualExpenses).toBe(12_800)
    expect(report.incomeByType.fixed).toBe(36_000)
    expect(report.incomeByType.temporary).toBe(1_500)
    expect(report.incomeByType.actualVariable).toBe(150)
    expect(report.annualIncome).toBe(37_650)
    expect(report.months[1].income).toBe(3_650)
  })
})
