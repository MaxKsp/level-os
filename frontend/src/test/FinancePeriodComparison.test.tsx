import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { ExpenseLineV4, FinanceBootstrap } from "../modules/finance/contracts"
import { FinancePeriodComparison } from "../modules/finance/FinancePeriodComparison"

const expense = (id: string, value: number, date: string, categoria: string): ExpenseLineV4 => ({
  id, label: id, value, date, time: null, recorrencia: "none", categoria,
  method: null, bank: null, accountId: null, parcelas: null, createdAt: null,
})

const data: FinanceBootstrap = {
  accounts_v2: [],
  expense_lines_v4: [
    expense("mercado-atual", 500, "2026-08-05", "mercado"),
    expense("mercado-anterior", 300, "2026-07-05", "mercado"),
    expense("lazer-novo", 120, "2026-08-09", "lazer"),
  ],
  income_lines: [], "ifood-entries": [], vaults: [], transfers: [], acc_view: "conta", bank_favorites: [],
}

const range = { start: "2026-08-01", end: "2026-08-18", label: "01 ago – 18 ago" }

describe("FinancePeriodComparison", () => {
  it("declara o recorte usado e os dois intervalos comparados", () => {
    render(<FinancePeriodComparison data={data} range={range} />)

    expect(screen.getByText("Parcial equivalente")).toBeVisible()
    const description = screen.getByText((_, element) => {
      const text = element?.textContent ?? ""
      return element?.tagName === "P" && text.includes("vs.") && /01.*jul/.test(text) && /18.*jul/.test(text)
    })
    expect(description).toBeVisible()
    expect(screen.getByText(/O intervalo anterior usa o recorte correspondente ao atual/)).toBeVisible()
  })

  it("mostra despesa maior como alerta e base zero como novo", () => {
    render(<FinancePeriodComparison data={data} range={range} />)

    const metrics = within(screen.getByTestId("period-comparison-metrics"))
    const expenses = metrics.getByText("Despesas no período").closest("div")!
    expect(expenses).toHaveTextContent("R$ 620,00")
    expect(expenses).toHaveTextContent("+R$ 320,00")
    expect(expenses).toHaveTextContent("+107%")
    expect(within(expenses as HTMLElement).getByText("+R$ 320,00").closest("p")).toHaveClass("text-error")

    const lazer = screen.getByText("Lazer").closest("li")!
    expect(lazer).toHaveTextContent("novo")
  })
})
