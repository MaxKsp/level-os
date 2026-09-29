import { describe, expect, it } from "vitest"
import { dietBudget } from "./dietBudget"
describe("dietBudget", () => {
  it("usa centavos e indica orçamento excedido como estimativa", () => {
    expect(dietBudget({ budgetBRL: 250.10, estimatedCostBRL: 270.25, periodDays: 5 })).toEqual({
      totalEstimate: 270.25, budget: 250.1, difference: -20.15, dailyAverage: 54.05,
      usedPercent: 108, overBudget: true,
    })
  })
  it("não fabrica proporção quando o orçamento é ausente", () => {
    expect(dietBudget({ budgetBRL: 0, estimatedCostBRL: 30, periodDays: 3 }).usedPercent).toBeNull()
  })
})
