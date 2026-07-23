import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { FinanceProvider, genId, toggleFavoriteBank, useFinance } from "../modules/finance/store"
import type { AccountV2 } from "../modules/finance/contracts"
import { ProgressProvider } from "../modules/progress/store"

const newAcc = (label: string): AccountV2 => ({
  id: genId(), label, tipo: "conta", saldo: 100, chequeEspecial: 0, limite: 0,
  fatura: 0, fechamento: null, vencimento: null, bank: "Inter", principal: false, createdAt: Date.now(),
})

function Probe() {
  const fin = useFinance()
  return (
    <div>
      <span data-testid="count">{fin.accounts.length}</span>
      <button onClick={() => fin.addAccount(newAcc("Conta nova"))}>add</button>
      <button onClick={() => fin.removeAccount(fin.accounts[fin.accounts.length - 1]?.id)}>del</button>
    </div>
  )
}

describe("FinanceProvider — CRUD de contas persistido", () => {
  beforeEach(() => localStorage.clear())

  it("adiciona e remove conta, atualizando o estado", () => {
    render(<ProgressProvider><FinanceProvider><Probe /></FinanceProvider></ProgressProvider>)
    const count = () => Number(screen.getByTestId("count").textContent)
    const seed = count()
    expect(seed).toBeGreaterThan(0) // semeado do mock

    fireEvent.click(screen.getByText("add"))
    expect(count()).toBe(seed + 1)

    fireEvent.click(screen.getByText("del"))
    expect(count()).toBe(seed)
  })

  it("persiste em localStorage", () => {
    render(<ProgressProvider><FinanceProvider><Probe /></FinanceProvider></ProgressProvider>)
    fireEvent.click(screen.getByText("add"))
    const raw = localStorage.getItem("level-os:finance:v1")
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!).accounts.some((a: AccountV2) => a.label === "Conta nova")).toBe(true)
  })

  it("limita bancos favoritos a cinco e permite desfavoritar", () => {
    const five = ["Nubank", "Inter", "Next", "Itaú", "C6 Bank"]
    expect(toggleFavoriteBank(five, "Banco do Brasil")).toEqual(five)
    expect(toggleFavoriteBank(five, "Next")).toEqual(["Nubank", "Inter", "Itaú", "C6 Bank"])
    expect(toggleFavoriteBank(["Nubank"], "nubank")).toEqual([])
  })
})
