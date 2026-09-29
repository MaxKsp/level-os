import type { DietPlan } from "./store"
export interface DietBudget {
  totalEstimate: number
  budget: number
  difference: number
  dailyAverage: number
  usedPercent: number | null
  overBudget: boolean
}
const cents = (value: number) => Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : 0
export function dietBudget(plan: Pick<DietPlan, "estimatedCostBRL" | "budgetBRL" | "periodDays">): DietBudget {
  const estimate = cents(plan.estimatedCostBRL)
  const budget = cents(plan.budgetBRL)
  const days = Number.isInteger(plan.periodDays) && plan.periodDays > 0 ? plan.periodDays : 1
  return {
    totalEstimate: estimate / 100,
    budget: budget / 100,
    difference: (budget - estimate) / 100,
    dailyAverage: Math.round(estimate / days) / 100,
    usedPercent: budget > 0 ? Math.round(estimate / budget * 100) : null,
    overBudget: budget > 0 && estimate > budget,
  }
}
