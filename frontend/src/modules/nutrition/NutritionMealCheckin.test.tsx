import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import type { DietPlan } from "./store"
import { NutritionMealCheckin } from "./NutritionMealCheckin"
const plan: DietPlan = { id: "p123", goal: "manutencao", periodDays: 1, budgetBRL: 40, estimatedCostBRL: 30,
  days: [{ day: 1, meals: [{ name: "Almoço", description: "Arroz, frango e vegetais", estimatedCostBRL: 15 }] }],
}
afterEach(() => { window.LEVEL_OS_USER_SCOPE = null; localStorage.clear() })
describe("NutritionMealCheckin", () => {
  it("não marca consumo automaticamente e salva somente status por usuário", () => {
    window.LEVEL_OS_USER_SCOPE = "userA"
    render(<NutritionMealCheckin plan={plan} planKey="p123" dayNumber={1} />)
    const done = screen.getByRole("button", { name: "Marcar Almoço como realizada" })
    expect(done).toHaveAttribute("aria-pressed", "false")
    fireEvent.click(done)
    expect(done).toHaveAttribute("aria-pressed", "true")
    const raw = localStorage.getItem("level-os:nutrition:checkins:p123:user:userA") ?? ""
    expect(JSON.parse(raw)).toEqual({ "1:0": "consumed" })
    expect(raw).not.toContain("frango")
  })
  it("isola as marcações se a conta mudar na mesma página", () => {
    window.LEVEL_OS_USER_SCOPE = "userA"
    localStorage.setItem("level-os:nutrition:checkins:p123:user:userA", JSON.stringify({ "1:0": "consumed" }))
    const app = render(<NutritionMealCheckin plan={plan} planKey="p123" dayNumber={1} />)
    expect(screen.getByRole("button", { name: "Marcar Almoço como realizada" })).toHaveAttribute("aria-pressed", "true")
    window.LEVEL_OS_USER_SCOPE = "userB"
    app.rerender(<NutritionMealCheckin plan={plan} planKey="p123" dayNumber={1} />)
    expect(screen.getByRole("button", { name: "Marcar Almoço como realizada" })).toHaveAttribute("aria-pressed", "false")
    expect(localStorage.getItem("level-os:nutrition:checkins:p123:user:userB")).toBeNull()
  })
})
