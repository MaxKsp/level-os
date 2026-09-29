import type { DietPlan, ShoppingItem } from "./store"

/** Links públicos; nunca representam API ou checkout integrado. */
export const NUTRITION_PARTNERS = {
  ifood: { name: "iFood Mercado", website: "https://www.ifood.com.br/", integration: "external-handoff" as const },
  livup: { name: "Liv Up", website: "https://www.livup.com.br/", integration: "external-handoff" as const },
}
export const LIVUP_PROMOTION = { code: "max6f466d9a", advertisedRate: 15 } as const

export function simulateLivupDiscount(subtotalBRL: number) {
  if (!Number.isFinite(subtotalBRL) || subtotalBRL < 0 || subtotalBRL > 1_000_000) return null
  const subtotalCents = Math.round(subtotalBRL * 100)
  const discountCents = Math.round(subtotalCents * LIVUP_PROMOTION.advertisedRate / 100)
  return { subtotal: subtotalCents / 100, estimatedDiscount: discountCents / 100,
    estimatedAfterDiscount: (subtotalCents - discountCents) / 100 }
}
export function shoppingGuide(items: ShoppingItem[], purchased: ReadonlySet<number> = new Set()) {
  return items.flatMap((entry, index) => purchased.has(index) ? [] : [`${entry.item} — ${entry.quantity}`]).join("\n")
}

/** Guia textual para comparar pratos no fornecedor, sem alegar correspondência ao catálogo dele. */
export function mealComparisonGuide(plan: Pick<DietPlan, "days">) {
  const descriptors = plan.days.flatMap((day) => day.meals
    .filter((meal) => /almo[çc]o|jantar|refei[çc][ãa]o principal/i.test(meal.name))
    .map((meal) => meal.description.trim()).filter(Boolean))
  return [...new Set(descriptors)].slice(0, 15).map((meal, index) => `${index + 1}. ${meal}`).join("\n")
}
