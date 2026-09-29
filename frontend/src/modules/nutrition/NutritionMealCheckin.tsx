import { useState } from "react"
import { Check, Circle, RotateCcw, UtensilsCrossed, X } from "lucide-react"
import { cn } from "../../lib/cn"
import { userStorageKey } from "../../lib/userStorage"
import type { DietPlan } from "./store"
import { mealCheckinSummary, mealKey, normalizeMealCheckins, type MealCheckins, type MealCheckinStatus } from "./nutritionCheckin"

const brl = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
function scopedKey(planKey: string): string | null {
  if (typeof window === "undefined" || !/^[a-zA-Z0-9_-]{1,128}$/.test(String(window.LEVEL_OS_USER_SCOPE ?? ""))) return null
  return userStorageKey("level-os:nutrition:checkins:" + planKey.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80))
}
function saved(key: string | null, plan: DietPlan): MealCheckins {
  if (!key) return {}
  try { return normalizeMealCheckins(JSON.parse(localStorage.getItem(key) ?? "{}"), plan) } catch { return {} }
}
export function NutritionMealCheckin({ plan, dayNumber, planKey }: {
  plan: DietPlan; dayNumber: number; planKey: string; key?: string
}) {
  const key = scopedKey(planKey)
  const [session, setSession] = useState(() => ({ key, checks: saved(key, plan) }))
  const checks = session.key === key ? session.checks : saved(key, plan)
  const [notice, setNotice] = useState("")
  const day = plan.days.find((item) => item.day === dayNumber) ?? plan.days[0]
  const summary = mealCheckinSummary(plan, checks)
  const save = (next: MealCheckins) => {
    setSession({ key, checks: next })
    if (key) {
      try { window.localStorage.setItem(key, JSON.stringify(next)); setNotice("") }
      catch { setNotice("O navegador não permitiu salvar estas marcações; elas ficarão somente nesta sessão.") }
    }
  }
  const mark = (index: number, value: MealCheckinStatus) => {
    if (!day) return
    const slot = mealKey(day.day, index)
    const next = { ...checks }
    if (checks[slot] === value) delete next[slot]
    else next[slot] = value
    save(next)
  }
  const resetDay = () => {
    if (!day) return
    const next = { ...checks }
    day.meals.forEach((_, index) => delete next[mealKey(day.day, index)])
    save(next)
  }
  if (!day) return null
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3 bg-primary/5 px-4 py-3 sm:px-5">
      <div><p className="text-xs font-semibold text-on-surface">Check-in do cardápio</p>
        <p className="mt-1 text-[11px] text-muted">Você marcou {summary.consumed} realizada(s), {summary.skipped} não realizada(s), {summary.pending} sem registro na sequência gerada.</p>
      </div>
      <button type="button" disabled={!day.meals.some((_, index) => checks[mealKey(day.day, index)])}
        onClick={resetDay} className="inline-flex min-h-9 items-center gap-1 rounded-md border border-outline-variant px-2 text-xs text-muted hover:text-on-surface disabled:opacity-40">
        <RotateCcw className="size-3.5" />Reiniciar dia
      </button>
    </div>
    <ul className="divide-y divide-outline-variant" aria-label={`Refeições do dia ${day.day}`}>
      {day.meals.map((meal, index) => {
        const status = checks[mealKey(day.day, index)]
        return <li key={index} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><UtensilsCrossed className="size-4" /></span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-on-surface">{meal.name}</p>
              <p className="mt-1 text-sm leading-5 text-on-surface-variant">{meal.description}</p>
              <p className="mt-2 text-xs tabular-nums text-muted">{brl(meal.estimatedCostBRL)} · custo previsto</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-1.5 sm:justify-end">
            <button type="button" onClick={() => mark(index, "consumed")} aria-pressed={status === "consumed"} aria-label={`Marcar ${meal.name} como realizada`}
              className={cn("inline-flex min-h-9 items-center gap-1 rounded-lg border px-2.5 text-[11px] font-semibold", status === "consumed"
                ? "border-primary/40 bg-primary/15 text-primary" : "border-outline-variant text-muted hover:text-primary")}>
              {status === "consumed" ? <Check className="size-3.5" /> : <Circle className="size-3" />}Realizada
            </button>
            <button type="button" onClick={() => mark(index, "skipped")} aria-pressed={status === "skipped"} aria-label={`Marcar ${meal.name} como não realizada`}
              className={cn("inline-flex min-h-9 items-center gap-1 rounded-lg border px-2.5 text-[11px] font-semibold", status === "skipped"
                ? "border-warning/40 bg-warning/10 text-on-surface" : "border-outline-variant text-muted hover:text-on-surface")}>
              <X className="size-3.5" />Não realizada
            </button>
          </div>
        </li>
      })}
    </ul>
    <p className="px-4 pb-4 text-[11px] leading-5 text-muted sm:px-5">
      Registro voluntário: marcar uma refeição não comprova consumo, porção ou qualidade nutricional.
      {key ? " As marcações ficam apenas neste navegador, separadas por conta e versão do plano." : " Sem conta identificada, as marcações duram somente enquanto esta tela permanece aberta."}
    </p>
    {notice ? <p role="status" className="px-4 pb-3 text-[11px] text-warning">{notice}</p> : null}
  </div>
}
