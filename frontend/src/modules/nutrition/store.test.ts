import { describe, expect, it } from "vitest"
import { parseDietPlan } from "./store"

const basePlan = {
  goal: "emagrecimento",
  periodDays: 7,
  budgetBRL: 400,
  estimatedCostBRL: 390,
  days: [{ day: 1, meals: [] }],
}

describe("parseDietPlan", () => {
  it("normaliza e limita a lista de compras recebida da API", () => {
    const plan = parseDietPlan({
      ...basePlan,
      shoppingList: [
        { item: " Arroz ", quantity: " 2 kg ", category: "mercearia" },
        { item: "Frango", quantity: "1 kg", category: "categoria-inválida" },
        { item: "", quantity: "1 pacote", category: "outros" },
        null,
      ],
    })

    expect(plan?.shoppingList).toEqual([
      { item: "Arroz", quantity: "2 kg", category: "mercearia" },
      { item: "Frango", quantity: "1 kg", category: "outros" },
    ])
  })

  it("mantém compatibilidade com planos antigos sem lista", () => {
    expect(parseDietPlan(basePlan)?.shoppingList).toEqual([])
  })
})
