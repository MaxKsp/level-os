import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import { NutritionManualEditor } from "./NutritionManualEditor"
import type { DietPlan } from "./store"
vi.mock("../../components/ui/Modal", () => ({
  Modal: ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) =>
    isOpen ? <div role="dialog">{children}</div> : null,
}))
const old: DietPlan = {
  id: "np_aaaaaaaaaaaaaaaaaaaaaaaaaaaa", goal: "manutencao", periodDays: 1,
  budgetBRL: 40, estimatedCostBRL: 30, days: [{ day: 1, meals: [
    { name: "Almoço", description: "Arroz", estimatedCostBRL: 30 },
  ] }], shoppingList: [],
}
describe("NutritionManualEditor", () => {
  it("envia o rascunho digitado e mantém seu ID em tentativa repetida", async () => {
    const onSave = vi.fn().mockRejectedValueOnce(new Error("Erro temporário")).mockResolvedValueOnce(undefined)
    render(<NutritionManualEditor initial={null} hasActivePlan={false} expectedActivePlanId={null} onClose={vi.fn()} onSave={onSave} />)
    fireEvent.change(screen.getByRole("textbox", { name: "Nome da refeição 1" }), { target: { value: "Café" } })
    fireEvent.change(screen.getByRole("textbox", { name: "Custo da refeição 1" }), { target: { value: "10,25" } })
    fireEvent.click(screen.getByRole("button", { name: "Criar plano manualmente" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Erro temporário")
    fireEvent.click(screen.getByRole("button", { name: "Criar plano manualmente" }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2))
    expect(onSave.mock.calls[0][0].manualDraftId).toEqual(onSave.mock.calls[1][0].manualDraftId)
    expect(onSave.mock.calls[0][0]).toMatchObject({
      goal: "manutencao", periodDays: 7, expectedActivePlanId: null,
      days: [{ day: 1, meals: [{ name: "Café", estimatedCostBRL: 10.25 }] }],
    })
  })
  it("exige confirmação antes de substituir e mantém histórico a cargo do backend", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<NutritionManualEditor initial={old} hasActivePlan expectedActivePlanId={old.id!}
      onClose={vi.fn()} onSave={onSave} />)
    const button = screen.getByRole("button", { name: "Salvar nova versão" })
    expect(button).toBeDisabled()
    fireEvent.click(screen.getByRole("checkbox", { name: "Confirmar substituição do plano atual" }))
    fireEvent.click(button)
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave.mock.calls[0][0]).toMatchObject({
      expectedActivePlanId: old.id, replaceConfirmed: true, days: old.days,
    })
  })
  it("permite montar dias adicionais e criar a lista manualmente", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<NutritionManualEditor initial={null} hasActivePlan={false} expectedActivePlanId={null} onClose={vi.fn()} onSave={onSave} />)
    fireEvent.change(screen.getByRole("textbox", { name: "Nome da refeição 1" }), { target: { value: "Café" } })
    fireEvent.click(screen.getByRole("button", { name: /Duplicar dia/i }))
    expect(screen.getByRole("tab", { name: "Dia 2" })).toHaveAttribute("aria-selected", "true")
    fireEvent.click(screen.getByRole("button", { name: "Ingrediente" }))
    fireEvent.change(screen.getByRole("textbox", { name: "Ingrediente 1" }), { target: { value: "Arroz" } })
    fireEvent.change(screen.getByRole("textbox", { name: "Quantidade do ingrediente 1" }), { target: { value: "1 kg" } })
    fireEvent.click(screen.getByRole("button", { name: "Criar plano manualmente" }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave.mock.calls[0][0].days).toHaveLength(2)
    expect(onSave.mock.calls[0][0].shoppingList).toMatchObject([{ item: "Arroz", quantity: "1 kg" }])
  })
})
