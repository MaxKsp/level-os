import { describe, expect, it } from "vitest"
import type { DietPlan } from "./store"
import { mealCheckinSummary, normalizeMealCheckins } from "./nutritionCheckin"
const plan: DietPlan = { id: "a", goal: "manutencao", periodDays: 1, budgetBRL: 50, estimatedCostBRL: 40,
  days: [{ day: 1, meals: [{ name: "Café", description: "", estimatedCostBRL: 5 },
    { name: "Almoço", description: "", estimatedCostBRL: 15 }] }],
}
describe("nutrition check-in", () => {
  it("aceita apenas slots reais e status permitidos, sem carregar conteúdo arbitrário do storage", () => {
    const checks = normalizeMealCheckins({ "1:0": "consumed", "1:1": "skipped", "2:0": "consumed",
      "__proto__": "consumed", "1:8": "consumed", "1:99": { status: "consumed" } }, plan)
    expect(checks).toEqual({ "1:0": "consumed", "1:1": "skipped" })
    expect(mealCheckinSummary(plan, checks)).toEqual({ total: 2, consumed: 1, skipped: 1, pending: 0 })
  })
  it("não deduz refeições consumidas a partir do cardápio planejado", () => {
    expect(mealCheckinSummary(plan, {})).toEqual({ total: 2, consumed: 0, skipped: 0, pending: 2 })
  })
})
