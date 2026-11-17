import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { DietPlan } from "./store"
import { NutritionMealCheckin } from "./NutritionMealCheckin"

const plan: DietPlan = {
  id: "p123", goal: "manutencao", periodDays: 1, budgetBRL: 40, estimatedCostBRL: 30,
  days: [{ day: 1, meals: [{ name: "Almoco", description: "Arroz", estimatedCostBRL: 15 }] }],
}
afterEach(() => { window.LEVEL_OS_USER_SCOPE = null; localStorage.clear() })
describe("NutritionMealCheckin sincronizado", () => {
  it("usa backend como fonte e permite desfazer; nao grava confirmacoes apenas no dispositivo", async () => {
    window.LEVEL_OS_USER_SCOPE = "userA"
    const onSync = vi.fn(async (_slot: string, _status: "consumed" | "skipped" | null) => {})
    const view = render(<NutritionMealCheckin plan={plan} planKey="p123" dayNumber={1}
      syncedChecks={{}} onSync={onSync} />)
    const done = screen.getByRole("button", { name: "Marcar Almoco como realizada" })
    fireEvent.click(done)
    await waitFor(() => expect(onSync).toHaveBeenCalledWith("1:0", "consumed"))
    await waitFor(() => expect(done).not.toBeDisabled())
    expect(localStorage.getItem("level-os:nutrition:checkins:p123:user:userA")).toBeNull()
    view.rerender(<NutritionMealCheckin plan={plan} planKey="p123" dayNumber={1}
      syncedChecks={{ "1:0": "consumed" }} onSync={onSync} />)
    expect(done).toHaveAttribute("aria-pressed", "true")
    fireEvent.click(done)
    await waitFor(() => expect(onSync).toHaveBeenLastCalledWith("1:0", null))
  })
  it("desfaz os check-ins do dia via operacao de sincronizacao", async () => {
    window.LEVEL_OS_USER_SCOPE = "userA"
    const onSync = vi.fn(async (_slot: string, _status: "consumed" | "skipped" | null) => {})
    render(<NutritionMealCheckin plan={plan} planKey="p123" dayNumber={1}
      syncedChecks={{ "1:0": "skipped" }} onSync={onSync} />)
    fireEvent.click(screen.getByRole("button", { name: /Reiniciar dia/i }))
    await waitFor(() => expect(onSync).toHaveBeenCalledWith("1:0", null))
  })
})
