import { describe, expect, it } from "vitest"
import type { DietPlan } from "./store"
import type { NutritionWorkspace } from "./nutritionWorkspace"
import { nutritionWeeklySummary } from "./NutritionWeeklySnapshot"

const plan: DietPlan = {
  id: "p1", goal: "manutencao", periodDays: 1, budgetBRL: 100, estimatedCostBRL: 80,
  days: [{ day: 1, meals: [{ name: "Almoco", description: "Arroz e legumes", estimatedCostBRL: 15 }] }],
}
const workspace: NutritionWorkspace = {
  revision: 1,
  preferences: { favorites: [], avoids: [], notes: "", prepMinutes: 30, shareWithRita: false },
  pantry: [
    { id: "a", name: "Tomate", quantity: 2, unit: "un", category: "hortifruti", expiresOn: "2026-09-30" },
    { id: "b", name: "Arroz", quantity: 1, unit: "kg", category: "mercearia", expiresOn: "2026-11-01" },
  ],
  recipes: [], family: [],
  diary: [
    { id: "d1", date: "2026-09-29", title: "Almoco", portion: "", note: "" },
    { id: "d2", date: "2026-09-24", title: "Jantar", portion: "", note: "" },
    { id: "d3", date: "2026-09-22", title: "Fora da janela", portion: "", note: "" },
  ],
  purchases: [
    { id: "c1", date: "2026-09-29", description: "Mercado", amountBRL: 34.9, category: "mercado" },
    { id: "c2", date: "2026-09-21", description: "Anterior", amountBRL: 99, category: "mercado" },
  ],
  mealChecks: { p1: { "1:0": "consumed" } }, cartChecks: {},
}
describe("nutritionWeeklySummary", () => {
  it("separa janela semanal, custo declarado, validade e check-in da sequencia do plano", () => {
    const result = nutritionWeeklySummary(workspace, plan, new Date(2026, 8, 29, 12))
    expect(result.from).toBe("2026-09-23")
    expect(result.to).toBe("2026-09-29")
    expect(result.meals).toBe(2)
    expect(result.recordedDays).toBe(2)
    expect(result.spent).toBe(34.9)
    expect(result.purchases).toBe(1)
    expect(result.expiring).toBe(1)
    expect(result.checks).toEqual({ total: 1, consumed: 1, skipped: 0, pending: 0 })
    expect(result.daily).toHaveLength(7)
    expect(result.daily.reduce((sum, entry) => sum + entry.meals, 0)).toBe(2)
    const month = nutritionWeeklySummary(workspace, plan, new Date(2026, 8, 29, 12), 30)
    expect(month.from).toBe("2026-08-31")
    expect(month.meals).toBe(3)
    expect(month.recordedDays).toBe(3)
    expect(month.spent).toBe(133.9)
    expect(month.daily).toHaveLength(30)
    expect(nutritionWeeklySummary(workspace, null, new Date(2026, 8, 29, 12)).checks).toBeNull()
  })
})
