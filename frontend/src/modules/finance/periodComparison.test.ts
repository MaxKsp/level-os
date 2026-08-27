import { describe, expect, it } from "vitest"
import type { ExpenseLineV4, FinanceBootstrap } from "./contracts"
import { resolveFinancePeriod } from "./period"
import { buildPeriodComparison, computeDelta, expenseTone, formatDeltaPercentage, incomeTone, resolvePreviousRange } from "./periodComparison"

const expense = (id: string, value: number, date: string, categoria: string): ExpenseLineV4 => ({
  id, label: id, value, date, time: null, recorrencia: "none", categoria,
  method: null, bank: null, accountId: null, parcelas: null, createdAt: null,
})

const bootstrap = (expenses: ExpenseLineV4[]): FinanceBootstrap => ({
  accounts_v2: [], expense_lines_v4: expenses, income_lines: [], "ifood-entries": [],
  vaults: [], transfers: [], acc_view: "conta", bank_favorites: [],
})

describe("resolvePreviousRange", () => {
  it("compara mês em andamento com os mesmos dias do mês anterior", () => {
    const range = { start: "2026-08-01", end: "2026-08-18", label: "atual" }
    expect(resolvePreviousRange(range)).toMatchObject({
      mode: "partial-equivalent",
      previous: { start: "2026-07-01", end: "2026-07-18" },
    })
  })

  it("compara mês completo com o mês anterior completo, mesmo com durações diferentes", () => {
    expect(resolvePreviousRange({ start: "2026-03-01", end: "2026-03-31", label: "atual" })).toMatchObject({
      mode: "closed",
      previous: { start: "2026-02-01", end: "2026-02-28" },
    })
  })

  it("limita o dia final quando o mês anterior é mais curto", () => {
    expect(resolvePreviousRange({ start: "2026-03-01", end: "2026-03-30", label: "atual" }).previous).toMatchObject({
      start: "2026-02-01",
      end: "2026-02-28",
    })
  })

  it("usa janela imediatamente anterior de igual duração fora do mês fechado", () => {
    expect(resolvePreviousRange(resolveFinancePeriod("30d", "", "", new Date(2026, 7, 20)))).toMatchObject({
      mode: "rolling-window",
      previous: { start: "2026-06-22", end: "2026-07-21" },
    })
  })
})

describe("computeDelta", () => {
  it("soma em centavos e calcula percentual sobre base positiva", () => {
    expect(computeDelta(150.1, 100.05)).toMatchObject({ absolute: 50.05, direction: "increased" })
    expect(Math.round(computeDelta(150, 100).percentage!)).toBe(50)
  })

  it("classifica base zero como novo em vez de percentual infinito", () => {
    const delta = computeDelta(80, 0)
    expect(delta).toMatchObject({ percentage: null, direction: "new" })
    expect(formatDeltaPercentage(delta)).toBe("novo")
  })

  it("trata os dois lados zerados como sem variação", () => {
    expect(formatDeltaPercentage(computeDelta(0, 0))).toBe("sem variação")
  })

  it("aplica cor por significado, não pelo sinal do número", () => {
    expect(expenseTone("increased")).toBe("warning")
    expect(expenseTone("decreased")).toBe("positive")
    expect(incomeTone("increased")).toBe("positive")
    expect(incomeTone("decreased")).toBe("warning")
  })
})

describe("buildPeriodComparison", () => {
  it("compara apenas intervalos equivalentes e ordena categorias por impacto", () => {
    const data = bootstrap([
      expense("mercado-atual", 500, "2026-08-05", "mercado"),
      expense("transporte-atual", 100, "2026-08-06", "transporte"),
      expense("mercado-anterior", 300, "2026-07-05", "mercado"),
      expense("transporte-anterior", 180, "2026-07-06", "transporte"),
      expense("fora-da-janela", 9_999, "2026-07-28", "mercado"),
    ])
    const comparison = buildPeriodComparison(data, { start: "2026-08-01", end: "2026-08-18", label: "1 ago – 18 ago" })

    expect(comparison.mode).toBe("partial-equivalent")
    expect(comparison.comparisonLabel).toContain("vs.")
    expect(comparison.expenses).toMatchObject({ current: 600, previous: 480, absolute: 120, direction: "increased" })
    expect(comparison.categories[0]).toMatchObject({ category: "mercado", absolute: 200, direction: "increased" })
    expect(comparison.categories[1]).toMatchObject({ category: "transporte", absolute: -80, direction: "decreased" })
  })
})
