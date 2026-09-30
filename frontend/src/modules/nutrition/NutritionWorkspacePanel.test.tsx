import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { NutritionWorkspacePanel } from "./NutritionWorkspacePanel"
import type { NutritionWorkspace } from "./nutritionWorkspace"

const workspace: NutritionWorkspace = {
  revision: 1, preferences: { favorites: [], avoids: [], notes: "", prepMinutes: 30, shareWithRita: false },
  pantry: [{ id: "p1", name: "Arroz", quantity: 1.5, unit: "kg", category: "mercearia", expiresOn: null }],
  diary: [{ id: "d1", date: "2026-09-29", title: "Almoço", portion: "1 prato", note: "" }],
  purchases: [{ id: "c1", date: "2026-09-29", description: "Mercado", amountBRL: 45, category: "mercado" }],
  recipes: [], family: [], mealChecks: {}, cartChecks: {},
}
function setup() {
  const save = vi.fn(async () => workspace)
  render(<NutritionWorkspacePanel plan={null} workspace={workspace} loading={false} error=""
    save={save} refresh={vi.fn(async () => {})} askRita={vi.fn()} />)
  return save
}
describe("Gestão alimentar editável", () => {
  it("edita o estoque preservando identificador e sem duplicar o produto", async () => {
    const save = setup()
    fireEvent.click(screen.getByRole("tab", { name: "Despensa" }))
    fireEvent.click(screen.getByRole("button", { name: "Editar estoque de Arroz" }))
    expect(screen.getByRole("textbox", { name: "Ingrediente" })).toHaveValue("Arroz")
    fireEvent.change(screen.getByRole("spinbutton", { name: "Quantidade" }), { target: { value: "2" } })
    fireEvent.click(screen.getByRole("button", { name: "Salvar item" }))
    await waitFor(() => expect(save).toHaveBeenCalledWith("save_pantry", { items: [
      expect.objectContaining({ id: "p1", name: "Arroz", quantity: 2, unit: "kg" }),
    ] }))
  })
  it("impede baixa acima do saldo e desconta somente quantidade informada", async () => {
    const save = setup()
    fireEvent.click(screen.getByRole("tab", { name: "Despensa" }))
    fireEvent.click(screen.getByRole("button", { name: "Registrar consumo de Arroz" }))
    const amount = screen.getByRole("spinbutton", { name: "Quantidade utilizada de Arroz" })
    fireEvent.change(amount, { target: { value: "2" } })
    fireEvent.click(screen.getByRole("button", { name: "Confirmar baixa" }))
    expect(save).not.toHaveBeenCalled()
    expect(screen.getByRole("status")).toHaveTextContent(/não pode exceder o saldo/)
    fireEvent.change(amount, { target: { value: "0.5" } })
    fireEvent.click(screen.getByRole("button", { name: "Confirmar baixa" }))
    await waitFor(() => expect(save).toHaveBeenCalledWith("save_pantry", { items: [
      expect.objectContaining({ id: "p1", quantity: 1 }),
    ] }))
  })
  it("permite editar o diário sem criar um segundo registro", async () => {
    const save = setup()
    fireEvent.click(screen.getByRole("tab", { name: "Meu dia" }))
    fireEvent.click(screen.getByRole("button", { name: "Editar refeição Almoço" }))
    fireEvent.change(screen.getByRole("textbox", { name: "Refeição consumida" }), { target: { value: "Jantar" } })
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }))
    await waitFor(() => expect(save).toHaveBeenCalledWith("save_diary", { items: [
      expect.objectContaining({ id: "d1", title: "Jantar", date: "2026-09-29" }),
    ] }))
  })
})
