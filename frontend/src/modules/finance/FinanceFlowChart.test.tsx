import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { FinanceFlowChart } from "./FinanceFlowChart"

describe("FinanceFlowChart", () => {
  const points = [
    { key: "2026-08", label: "ago", income: 5000, expenses: 3200 },
    { key: "2026-09", label: "set", income: 5200, expenses: 4100 },
  ]

  it("expõe valores por período para teclado e toque", () => {
    render(<FinanceFlowChart points={points} ariaLabel="Fluxo financeiro" />)

    const august = screen.getByRole("listitem", { name: /ago: receitas/i })
    fireEvent.focus(august)
    expect(screen.getByText("Receitas · ago")).toBeInTheDocument()
    expect(screen.getByText("Despesas · ago")).toBeInTheDocument()

    fireEvent.click(august)
    expect(screen.getByLabelText("Fluxo financeiro")).toBeInTheDocument()
  })
})
