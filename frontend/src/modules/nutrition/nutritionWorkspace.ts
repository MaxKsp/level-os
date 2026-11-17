import { useCallback, useEffect, useRef, useState } from "react"
import type { DietPlan, ShoppingCategory } from "./store"
import { userStorageKey } from "../../lib/userStorage"
import { normalizeMealCheckins, type MealCheckins } from "./nutritionCheckin"

export interface PantryItem { id: string; name: string; quantity: number; unit: "un" | "g" | "kg" | "ml" | "l" | "pacote"; category: ShoppingCategory; expiresOn: string | null }
export interface RecipeItem { id: string; title: string; prepMinutes: number; portions: number; ingredients: { name: string; quantity: string }[]; instructions: string }
export interface DiaryItem { id: string; date: string; title: string; portion: string; note: string }
export interface PurchaseItem { id: string; date: string; description: string; amountBRL: number; category: "mercado" | "restaurante" | "marmita" | "outros" }
export interface FamilyItem { id: string; label: string; portionFactor: number }
export interface NutritionPreferences { favorites: string[]; avoids: string[]; notes: string; prepMinutes: number; shareWithRita: boolean }
export interface NutritionWorkspace {
  revision: number
  preferences: NutritionPreferences
  pantry: PantryItem[]
  recipes: RecipeItem[]
  diary: DiaryItem[]
  purchases: PurchaseItem[]
  family: FamilyItem[]
  mealChecks: Record<string, MealCheckins>
  cartChecks: Record<string, Record<string, boolean>>
}
const empty: NutritionWorkspace = { revision: 0, preferences: { favorites: [], avoids: [], notes: "", prepMinutes: 30, shareWithRita: false },
  pantry: [], recipes: [], diary: [], purchases: [], family: [], mealChecks: {}, cartChecks: {} }
export const newWorkspaceId = () => "nw_" + (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Math.random().toString(36).slice(2))
export const planWorkspaceId = (plan: DietPlan) => plan.id ?? "legacy"
export function useNutritionWorkspace(plan: DietPlan | null) {
  const [workspace, setWorkspace] = useState<NutritionWorkspace | null>(null)
  const current = useRef<NutritionWorkspace | null>(null)
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [error, setError] = useState("")
  const refresh = useCallback(async () => {
    if (!window.CSRF_TOKEN) { current.current = empty; setWorkspace(empty); setStatus("ready"); return }
    const response = await fetch("/api/nutrition-workspace.php", { credentials: "same-origin" })
    if (!response.ok) { setStatus("error"); throw new Error("Não foi possível sincronizar seu diário.") }
    const body = await response.json() as { workspace: NutritionWorkspace }
    current.current = body.workspace; setWorkspace(body.workspace); setStatus("ready"); setError("")
  }, [])
  useEffect(() => { void refresh().catch((e: Error) => setError(e.message)) }, [refresh])
  const save = useCallback((operation: string, changes: Record<string, unknown> = {}): Promise<NutritionWorkspace> => {
    const pending = queue.current.catch(() => undefined).then(async () => {
      if (!window.CSRF_TOKEN) throw new Error("Faça login para sincronizar seus registros.")
      const previous = current.current
      if (!previous) throw new Error("Carregue o diário antes de salvar.")
      const response = await fetch("/api/nutrition-workspace.php", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": window.CSRF_TOKEN },
        body: JSON.stringify({ operation, revision: previous.revision, ...changes }),
      })
      const data = await response.json().catch(() => null) as { workspace?: NutritionWorkspace; message?: string } | null
      if (!response.ok || !data?.workspace) {
        if (response.status === 409) await refresh().catch(() => undefined)
        const message = data?.message ?? (response.status === 409 ? "Dados atualizados em outro dispositivo. Revise e tente de novo." : "Não foi possível salvar.")
        setError(message); throw new Error(message)
      }
      current.current = data.workspace; setWorkspace(data.workspace); setError("")
      return data.workspace
    })
    queue.current = pending
    return pending
  }, [refresh])
  const imported = useRef(new Set<string>())
  useEffect(() => {
    if (!workspace || !plan || !window.CSRF_TOKEN || !window.LEVEL_OS_USER_SCOPE) return
    const planId = planWorkspaceId(plan)
    if (imported.current.has(planId)) return
    const safe = planId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80)
    const migrationKey = userStorageKey("level-os:nutrition:legacy-migrated:" + safe)
    const mealStorageKey = userStorageKey("level-os:nutrition:checkins:" + safe)
    const cartStorageKey = userStorageKey("level-os:nutrition:shopping:" + safe)
    try {
      if (localStorage.getItem(migrationKey) === "1") return
      // Um servidor ja preenchido tem precedencia sobre qualquer cache local antigo.
      if (Object.keys(workspace.mealChecks?.[planId] ?? {}).length || Object.keys(workspace.cartChecks?.[planId] ?? {}).length) {
        localStorage.setItem(migrationKey, "1")
        return
      }
      const mealRaw = JSON.parse(localStorage.getItem(mealStorageKey) ?? "{}") as unknown
      const cartRaw = JSON.parse(localStorage.getItem(cartStorageKey) ?? "[]") as unknown
      const mealChecks = normalizeMealCheckins(mealRaw, plan)
      const cartIndices = Array.isArray(cartRaw) ? cartRaw.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < (plan.shoppingList?.length ?? 0)) : []
      if (!Object.keys(mealChecks).length && !cartIndices.length) return
      imported.current.add(planId)
      void save("import_legacy", { planId, mealChecks, cartIndices }).then(() => {
        try {
          localStorage.setItem(migrationKey, "1")
          localStorage.removeItem(mealStorageKey)
          localStorage.removeItem(cartStorageKey)
        } catch { /* Os dados do servidor continuam autoritativos. */ }
      }).catch(() => imported.current.delete(planId))
    } catch { /* Storage is optional; server data is authoritative. */ }
  }, [plan, save, workspace])
  return { workspace, status, error, refresh, save }
}
