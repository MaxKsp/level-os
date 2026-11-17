import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ApiError } from "../lib/apiErrors"
import { ExpenseForm } from "../modules/finance/ExpenseForm"
import type { AccountV2 } from "../modules/finance/contracts"

const account: AccountV2 = {
  id: "acc-1", label: "Conta principal", tipo: "conta", saldo: 500,
  chequeEspecial: 0, limite: 0, fatura: 0, fechamento: null, vencimento: null,
  bank: "Inter", principal: true, createdAt: null,
}

describe("formulários financeiros — confirmação remota", () => {
  it("preserva o rascunho da despesa após recusa e permite retry", async () => {
    const onCancel = vi.fn()
    const onSave = vi.fn()
      .mockRejectedValueOnce(new ApiError("plan_required", 402, "individual"))
      .mockResolvedValueOnce(undefined)

    render(<ExpenseForm accounts={[account]} resetKey="new" onCancel={onCancel} onSave={onSave} />)
    const description = screen.getByLabelText("Descrição")
    fireEvent.change(description, { target: { value: "Mercado" } })
    fireEvent.change(screen.getByLabelText("Valor"), { target: { value: "10000" } })

    fireEvent.click(screen.getByRole("button", { name: "Lançar despesa" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("plano Individual")
    expect(onCancel).not.toHaveBeenCalled()
    expect(description).toHaveValue("Mercado")
    expect(screen.getByRole("button", { name: "Lançar despesa" })).toBeEnabled()

    fireEvent.click(screen.getByRole("button", { name: "Lançar despesa" }))
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1))
    expect(onSave).toHaveBeenCalledTimes(2)
  })
})
