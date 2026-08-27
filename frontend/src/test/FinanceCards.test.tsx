import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { FinanceBootstrap } from "../modules/finance/contracts"
import { FinanceCards } from "../modules/finance/FinanceCards"

const data: FinanceBootstrap = {
  accounts_v2: [{
    id: "card", label: "Cartão Principal", tipo: "cartao", saldo: 0, chequeEspecial: 0,
    limite: 5_000, fatura: 1_200, fechamento: 10, vencimento: 20,
    bank: "Inter", principal: false, createdAt: null,
  }],
  expense_lines_v4: [
    { id: "after", label: "Mercado", value: 100, date: "2026-08-12", time: null, recorrencia: "none", categoria: "mercado", method: "credito", bank: "Inter", accountId: "card", parcelas: null, createdAt: null },
    { id: "installment", label: "Notebook", value: 200, date: "2026-08-15", time: null, recorrencia: "none", categoria: "eletronicos", method: "credito", bank: "Inter", accountId: "card", parcelas: 3, createdAt: null },
  ],
  income_lines: [], "ifood-entries": [], vaults: [], transfers: [], acc_view: "conta", bank_favorites: [],
}

describe("FinanceCards", () => {
  it("rotula fatos e estimativas sem afirmar confirmação ou pagamento", () => {
    localStorage.setItem("level-os:finance:cards-open", "open")
    const { container } = render(<FinanceCards data={data} referenceDate={new Date(2026, 7, 20)} onAdd={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    const item = container.querySelector<HTMLElement>('[data-card-id="card"]')!
    const card = within(item)

    expect(card.getByText("Fatura atual informada")).toBeVisible()
    expect(card.getByText("Disponível calculado")).toBeVisible()
    expect(card.getByText("Limite informado")).toBeVisible()
    expect(card.getByText("Após fechamento · estimativa")).toBeVisible()
    expect(card.getByText("Parcelas futuras · estimativa")).toBeVisible()
    expect(card.getByText(/Estimativas são exibidas separadamente/)).toBeVisible()
    expect(card.getByRole("meter", { name: /Uso do limite/ })).toHaveAttribute("aria-valuetext", "R$ 1.200,00 de R$ 5.000,00")
    expect(item).not.toHaveTextContent(/fatura confirmada|quitad[oa]|parcelas? pagas?/i)
  })

  it("não expõe um meter inválido quando o limite não foi informado", () => {
    localStorage.setItem("level-os:finance:cards-open", "open")
    const withoutLimit = { ...data, accounts_v2: [{ ...data.accounts_v2[0], limite: 0 }] }
    render(<FinanceCards data={withoutLimit} referenceDate={new Date(2026, 7, 20)} onAdd={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />)

    expect(screen.getByText("Uso indisponível sem limite informado")).toBeVisible()
    expect(screen.queryByRole("meter")).not.toBeInTheDocument()
  })

  it("mantém ações funcionais e explica quando o fechamento não foi informado", () => {
    localStorage.setItem("level-os:finance:cards-open", "open")
    const onEdit = vi.fn()
    const withoutClosing = { ...data, accounts_v2: [{ ...data.accounts_v2[0], fechamento: null }] }
    render(<FinanceCards data={withoutClosing} referenceDate={new Date(2026, 7, 20)} onAdd={vi.fn()} onEdit={onEdit} onDelete={vi.fn()} />)

    expect(screen.getByText(/Informe o dia de fechamento para estimar/)).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Editar" }))
    expect(onEdit).toHaveBeenCalledWith(withoutClosing.accounts_v2[0])
  })
})
