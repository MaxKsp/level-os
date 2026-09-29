import { describe, expect, it } from "vitest"
import { LIVUP_PROMOTION, NUTRITION_PARTNERS, shoppingGuide, simulateLivupDiscount, mealComparisonGuide } from "./nutritionCommerce"

describe("nutrition shopping handoff", () => {
  it("não trata desconto simulado como preço de checkout", () => {
    expect(LIVUP_PROMOTION.code).toBe("max6f466d9a")
    expect(simulateLivupDiscount(250)).toEqual({ subtotal: 250, estimatedDiscount: 37.5, estimatedAfterDiscount: 212.5 })
    expect(simulateLivupDiscount(-1)).toBeNull()
    expect(simulateLivupDiscount(Number.POSITIVE_INFINITY)).toBeNull()
    expect(NUTRITION_PARTNERS.ifood.integration).toBe("external-handoff")
    expect(NUTRITION_PARTNERS.livup.integration).toBe("external-handoff")
  })
  it("exporta somente ingredientes pendentes sem enviar dados automaticamente", () => {
    const items = [{ item: "Arroz", quantity: "1 kg", category: "mercearia" as const },
      { item: "Frango", quantity: "800 g", category: "proteina" as const }]
    expect(shoppingGuide(items, new Set([0]))).toBe("Frango — 800 g")
    expect(shoppingGuide(items, new Set([0, 1]))).toBe("")
  })
  it("gera apenas um guia de comparação textual sem sugerir equivalência de catálogo", () => {
    const guide = mealComparisonGuide({ days: [{ day: 1, meals: [
      { name: "Café", description: "Fruta e aveia", estimatedCostBRL: 6 },
      { name: "Almoço", description: "Arroz e frango", estimatedCostBRL: 16 },
      { name: "Jantar", description: "Arroz e frango", estimatedCostBRL: 16 },
    ] }] })
    expect(guide).toBe("1. Arroz e frango")
  })
})
