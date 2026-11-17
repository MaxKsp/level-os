import type { DietPlan } from "./store"
export type MealCheckinStatus = "consumed" | "skipped"
export type MealCheckins = Record<string, MealCheckinStatus>
export const mealKey = (day: number, index: number) => `${day}:${index}`
/** Persiste apenas identificadores de slots e status, nunca alimentos/observações. */
export function normalizeMealCheckins(input: unknown, plan: DietPlan): MealCheckins {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {}
  const entries = Object.entries(input).slice(0, 500)
  const allowed = new Set(plan.days.flatMap((day) => day.meals.map((_, index) => mealKey(day.day, index))))
  return Object.fromEntries(entries.filter(([key, status]) => allowed.has(key) && (status === "consumed" || status === "skipped"))) as MealCheckins
}
export function mealCheckinSummary(plan: DietPlan, checks: MealCheckins) {
  const keys = plan.days.flatMap((day) => day.meals.map((_, index) => mealKey(day.day, index)))
  const consumed = keys.filter((key) => checks[key] === "consumed").length
  const skipped = keys.filter((key) => checks[key] === "skipped").length
  return { total: keys.length, consumed, skipped, pending: keys.length - consumed - skipped }
}
