import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { NutritionActionCenter } from "./NutritionActionCenter"
import type { NutritionWorkspace } from "./nutritionWorkspace"

const workspace = (permission: boolean): NutritionWorkspace => ({
  revision: 0, preferences: { favorites: [], avoids: [], notes: "", prepMinutes: 30, shareWithRita: permission },
  pantry: [], diary: [], recipes: [], purchases: [], family: [], mealChecks: {}, cartChecks: {},
})
describe("Consentimento na central alimentar", () => {
  it("não envia contexto para a Rita sem opt-in e direciona para preferências", () => {
    const onNavigate = vi.fn(), askRita = vi.fn()
    render(<NutritionActionCenter plan={null} workspace={workspace(false)}
      onNavigate={onNavigate} askRita={askRita} />)
    fireEvent.click(screen.getByRole("button", { name: "Configurar acesso da Rita" }))
    expect(onNavigate).toHaveBeenCalledWith("preferences")
    expect(askRita).not.toHaveBeenCalled()
  })
  it("permite iniciar a revisão contextual após consentimento", () => {
    const askRita = vi.fn()
    render(<NutritionActionCenter plan={null} workspace={workspace(true)}
      onNavigate={vi.fn()} askRita={askRita} />)
    fireEvent.click(screen.getByRole("button", { name: "Perguntar à Rita" }))
    expect(askRita).toHaveBeenCalledOnce()
  })
})
