import type { DietPlan } from "./store"

const cents = (value: number) => Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : 0
/** Soma apenas valores estimados existentes, sem atribuir macronutrientes fictícios. */
export function nutritionPlanAnalytics(plan: DietPlan) {
  const days = [...plan.days].sort((a, b) => a.day - b.day)
  const schedule = Array.from({ length: Math.min(60, Math.max(0, plan.periodDays)) }, (_, i) => {
    const template = days.length ? days[i % days.length] : null
    return {
      day: i + 1, templateDay: template?.day ?? null, meals: template?.meals.length ?? 0,
      expectedCostCents: template?.meals.reduce((sum, meal) => sum + cents(meal.estimatedCostBRL), 0) ?? 0,
    }
  })
  const sumCents = schedule.reduce((sum, day) => sum + day.expectedCostCents, 0)
  const declaredCents = cents(plan.estimatedCostBRL)
  const budgetCents = cents(plan.budgetBRL)
  return {
    days: schedule.map(({ expectedCostCents, ...day }) => ({ ...day, expectedCost: expectedCostCents / 100 })),
    totalMeals: schedule.reduce((sum, day) => sum + day.meals, 0),
    summedEstimate: sumCents / 100, declaredEstimate: declaredCents / 100,
    deltaVsDeclared: (sumCents - declaredCents) / 100,
    estimateMismatch: days.length > 0 && Math.abs(sumCents - declaredCents) > 500,
    budgetDifference: (budgetCents - sumCents) / 100,
    periodComplete: days.length > 0 && plan.periodDays >= 1 && plan.periodDays <= 60,
  }
}
