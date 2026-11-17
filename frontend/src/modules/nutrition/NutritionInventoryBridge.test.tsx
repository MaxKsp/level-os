import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { DietPlan } from "./store"
import type { NutritionWorkspace } from "./nutritionWorkspace"
import { NutritionInventoryBridge } from "./NutritionInventoryBridge"

const plan: DietPlan = { id: "planA", goal: "manutencao", periodDays: 2, budgetBRL: 50, estimatedCostBRL: 40,
  days: [], shoppingList: [
    { item: "Frango", quantity: "1 kg", category: "proteina" },
    { item: "Ovos", quantity: "1 dúzia", category: "proteina" },
  ] }
const workspace: NutritionWorkspace = {
  revision: 0, preferences: { favorites: [], avoids: [], notes: "", prepMinutes: 30, shareWithRita: false },
  pantry: [], recipes: [], diary: [], purchases: [], family: [], mealChecks: {}, cartChecks: { planA: { "0": true } },
}
describe("Integração plano → lista → despensa", () => {
  it("não presume que item marcado no carrinho entrou no estoque", () => {
    const save = vi.fn(async () => workspace)
    render(<NutritionInventoryBridge plan={plan} workspace={workspace} save={save} />)
    expect(screen.getByText("0/2 itens")).toBeInTheDocument()
    expect(screen.getAllByText("Não disponível na despensa")).toHaveLength(2)
    expect(save).not.toHaveBeenCalled()
  })
  it("cadastra entrada confirmada com peso, categoria e id independente do carrinho", async () => {
    const save = vi.fn(async () => workspace)
    render(<NutritionInventoryBridge plan={plan} workspace={workspace} save={save} />)
    fireEvent.click(screen.getAllByRole("button", { name: "Registrar entrada recebida" })[0])
    const quantity = screen.getByRole("textbox", { name: "Quantidade recebida" })
    expect(quantity).toHaveValue("1")
    fireEvent.click(screen.getByRole("button", { name: /Confirmar entrada na despensa/ }))
    await waitFor(() => expect(save).toHaveBeenCalledWith("save_pantry", {
      items: [expect.objectContaining({ name: "Frango", quantity: 1, unit: "kg", category: "proteina", expiresOn: null })],
    }))
    expect(screen.getByRole("status")).toHaveTextContent("Frango adicionado")
  })
  it("exige confirmação manual quando o cardápio descreve medida ambígua", async () => {
    const save = vi.fn(async () => workspace)
    render(<NutritionInventoryBridge plan={plan} workspace={workspace} save={save} />)
    fireEvent.click(screen.getAllByRole("button", { name: "Registrar entrada recebida" })[1])
    const quantity = screen.getByRole("textbox", { name: "Quantidade recebida" })
    expect(quantity).toHaveValue("")
    fireEvent.change(quantity, { target: { value: "-1" } })
    fireEvent.click(screen.getByRole("button", { name: /Confirmar entrada na despensa/ }))
    expect(save).not.toHaveBeenCalled()
    expect(screen.getByRole("status")).toHaveTextContent(/quantidade recebida/)
  })
})
