import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"

export interface DietMeal { name: string; description: string; estimatedCostBRL: number }
export interface DietDay { day: number; meals: DietMeal[] }
export type ShoppingCategory = "hortifruti" | "proteina" | "mercearia" | "laticinios" | "padaria" | "bebidas" | "outros"
export interface ShoppingItem { item: string; quantity: string; category: ShoppingCategory }
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
  shoppingList?: ShoppingItem[]
  createdAt?: string
}

declare global { interface Window { CSRF_TOKEN?: string } }
const hasBackend = () => typeof window !== "undefined" && Boolean(window.CSRF_TOKEN)
const shoppingCategories = new Set<ShoppingCategory>(["hortifruti", "proteina", "mercearia", "laticinios", "padaria", "bebidas", "outros"])

function parseShoppingItem(value: unknown): ShoppingItem | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const item = value as Partial<ShoppingItem>
  const name = typeof item.item === "string" ? item.item.trim().slice(0, 64) : ""
  const quantity = typeof item.quantity === "string" ? item.quantity.trim().slice(0, 32) : ""
  const category = shoppingCategories.has(item.category as ShoppingCategory) ? item.category as ShoppingCategory : "outros"
  return name && quantity ? { item: name, quantity, category } : null
}

export function parseDietPlan(value: unknown): DietPlan | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const plan = value as Partial<DietPlan>
  if (!Array.isArray(plan.days) || typeof plan.periodDays !== "number") return null
  const shoppingList = Array.isArray(plan.shoppingList)
    ? plan.shoppingList.map(parseShoppingItem).filter((item): item is ShoppingItem => item !== null).slice(0, 80)
    : []
  return { ...plan, shoppingList } as DietPlan
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

  const value = useMemo(() => ({ plan, history, status, refresh, clear, restore }), [clear, history, plan, refresh, restore, status])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useNutrition() {
  const value = useContext(Ctx)
  if (!value) throw new Error("useNutrition precisa estar dentro de NutritionProvider")
  return value
}
