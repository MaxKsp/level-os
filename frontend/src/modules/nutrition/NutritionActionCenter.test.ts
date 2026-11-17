import { describe, expect, it } from "vitest"
import type { DietPlan } from "./store"
import type { NutritionWorkspace } from "./nutritionWorkspace"
import { nutritionActions } from "./NutritionActionCenter"

const plan: DietPlan = {
  id: "p1", goal: "manutencao", periodDays: 7, budgetBRL: 300, estimatedCostBRL: 220,
  days: [{ day: 1, meals: [{ name: "Almoço", description: "arroz", estimatedCostBRL: 20 }] }],
  shoppingList: [
    { item: "Frango", quantity: "1 kg", category: "proteina" },
    { item: "Arroz integral", quantity: "1 kg", category: "mercearia" },
    { item: "Ovos", quantity: "12 un", category: "proteina" },
  ],
}
const workspace: NutritionWorkspace = {
  revision: 3, preferences: { favorites: [], avoids: [], notes: "", prepMinutes: 30, shareWithRita: false },
  pantry: [
    { id: "a", name: "Frango", quantity: 1, unit: "kg", category: "proteina", expiresOn: "2026-09-28" },
    { id: "b", name: "Arroz", quantity: 1, unit: "kg", category: "mercearia", expiresOn: "2026-10-01" },
    { id: "c", name: "Leite", quantity: 0, unit: "l", category: "laticinios", expiresOn: "2026-09-29" },
  ], family: [], diary: [],
  recipes: [
    { id: "r1", title: "Almoço rápido", prepMinutes: 20, portions: 2, ingredients: [], instructions: "" },
    { id: "r2", title: "Receita demorada", prepMinutes: 90, portions: 4, ingredients: [], instructions: "" },
  ],
  purchases: [
    { id: "c1", date: "2026-09-29", description: "Mercado", amountBRL: 45, category: "mercado" },
    { id: "c2", date: "2026-09-23", description: "Almoço fora", amountBRL: 28.5, category: "restaurante" },
    { id: "c3", date: "2026-09-22", description: "Fora da janela", amountBRL: 99, category: "outros" },
  ],
  mealChecks: {}, cartChecks: { p1: { "2": true } },
}
describe("nutritionActions — dados reais e período identificado", () => {
  it("não considera alimento vencido disponível nem unidade em zero na validade", () => {
    const result = nutritionActions(workspace, plan, new Date(2026, 8, 29, 12))
    expect(result.expired.map((item) => item.name)).toEqual(["Frango"])
    expect(result.expiring.map((item) => item.name)).toEqual(["Arroz"])
    expect(result.possibleAtHome.map((item) => item.item)).toEqual([])
    // "Arroz" não deve ser confundido com "Arroz integral".
    const verified = nutritionActions({ ...workspace, pantry: [...workspace.pantry,
      { id: "d", name: "Arroz integral", quantity: 1, unit: "kg", category: "mercearia", expiresOn: "2026-10-01" }] },
      plan, new Date(2026, 8, 29, 12))
    expect(verified.possibleAtHome.map((item) => item.item)).toEqual(["Arroz integral"])
    expect(result.pending.map((item) => item.item)).toEqual(["Frango", "Arroz integral"])
    expect(result.inCart).toBe(1)
    expect(result.shoppingTotal).toBe(3)
  })
  it("separa sete dias de compras registradas, orçamento do plano e receitas compatíveis com o tempo", () => {
    const result = nutritionActions(workspace, plan, new Date(2026, 8, 29, 12))
    expect(result.weekStart).toBe("2026-09-23")
    expect(result.weekTotal).toBe(73.5)
    expect(result.categorySpent.find((item) => item.category === "mercado")?.amount).toBe(45)
    expect(result.categorySpent.find((item) => item.category === "restaurante")?.amount).toBe(28.5)
    expect(result.quickRecipes.map((item) => item.id)).toEqual(["r1"])
    expect(nutritionActions(workspace, null, new Date(2026, 8, 29, 12)).shoppingTotal).toBe(0)
  })
})
