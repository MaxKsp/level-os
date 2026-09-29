import { describe, expect, it } from "vitest"
import type { DietPlan } from "./store"
import { nutritionPlanAnalytics } from "./nutritionPlanAnalytics"
const sample: DietPlan = { goal: "manutencao", periodDays: 4, budgetBRL: 110, estimatedCostBRL: 100,
  days: [{ day: 1, meals: [{ name: "Almoço", description: "Prato A", estimatedCostBRL: 20.25 }] },
    { day: 2, meals: [{ name: "Almoço", description: "Prato B", estimatedCostBRL: 24.75 }] }],
}
describe("nutritionPlanAnalytics", () => {
  it("contabiliza repetições do cardápio e valores em centavos, distinguindo estimativa declarada", () => {
    const result = nutritionPlanAnalytics(sample)
    expect(result.days.map((day) => day.expectedCost)).toEqual([20.25, 24.75, 20.25, 24.75])
    expect(result.summedEstimate).toBe(90)
    expect(result.declaredEstimate).toBe(100)
    expect(result.estimateMismatch).toBe(true)
    expect(result.budgetDifference).toBe(20)
    expect(result.totalMeals).toBe(4)
  })
  it("não inventa custo de refeições ou plano sem dias válidos", () => {
    const empty = nutritionPlanAnalytics({ ...sample, days: [] })
    expect(empty.summedEstimate).toBe(0)
    expect(empty.periodComplete).toBe(false)
    expect(empty.estimateMismatch).toBe(false)
  })
})
