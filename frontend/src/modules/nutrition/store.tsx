import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"

export interface DietMeal { name: string; description: string; estimatedCostBRL: number }
export interface DietDay { day: number; meals: DietMeal[] }
export interface DietPlan {
  id?: string
  version?: number
  status?: "active" | "archived"
  source?: "assistant" | "manual"
  goal: "emagrecimento" | "hipertrofia" | "manutencao"
  periodDays: number
  budgetBRL: number
  estimatedCostBRL: number
  days: DietDay[]
  createdAt?: string
}

declare global { interface Window { CSRF_TOKEN?: string } }
const hasBackend = () => typeof window !== "undefined" && Boolean(window.CSRF_TOKEN)

export function parseDietPlan(value: unknown): DietPlan | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const plan = value as Partial<DietPlan>
  if (!Array.isArray(plan.days) || typeof plan.periodDays !== "number") return null
  return plan as DietPlan
}

interface Value {
  plan: DietPlan | null
  history: DietPlan[]
  status: "loading" | "ready" | "error"
  refresh: () => Promise<void>
  clear: () => Promise<void>
  restore: (id: string) => Promise<void>
}
const Ctx = createContext<Value | undefined>(undefined)

export function NutritionProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<DietPlan | null>(null)
  const [history, setHistory] = useState<DietPlan[]>([])
  const [status, setStatus] = useState<Value["status"]>("loading")

  const refresh = useCallback(async () => {
    if (!hasBackend()) { setStatus("ready"); return }
    try {
      const response = await fetch("/api/nutrition.php", { credentials: "same-origin", headers: { Accept: "application/json" } })
      const body = await response.json().catch(() => null)
      if (!response.ok) throw new Error("nutrition load failed")
      setPlan(parseDietPlan(body?.plan))
      setHistory(Array.isArray(body?.history) ? body.history.map(parseDietPlan).filter((item: DietPlan | null): item is DietPlan => item !== null) : [])
      setStatus("ready")
    } catch {
      setStatus("error")
    }
  }, [])

  const clear = useCallback(async () => {
    if (!hasBackend()) { setPlan(null); return }
    await fetch("/api/nutrition.php", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": window.CSRF_TOKEN ?? "" },
      body: JSON.stringify({ operation: "archive_active" }),
    })
    setPlan(null)
    await refresh()
  }, [refresh])

  const restore = useCallback(async (id: string) => {
    if (!hasBackend()) return
    const response = await fetch("/api/nutrition.php", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": window.CSRF_TOKEN ?? "" },
      body: JSON.stringify({ operation: "restore_plan", id }),
    })
    if (!response.ok) throw new Error("Não foi possível restaurar o plano.")
    await refresh()
  }, [refresh])

  useEffect(() => { void refresh() }, [refresh])

  return <Ctx.Provider value={{ plan, history, status, refresh, clear, restore }}>{children}</Ctx.Provider>
}

export function useNutrition() {
  const value = useContext(Ctx)
  if (!value) throw new Error("useNutrition precisa estar dentro de NutritionProvider")
  return value
}
