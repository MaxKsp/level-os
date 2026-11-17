import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { FinanceDashboard } from "./FinanceDashboard"
import { financeBootstrapMock } from "./mock"

describe("FinanceDashboard period filter", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 6, 18, 12)) })
  afterEach(() => vi.useRealTimers())

  it("updates totals for quick and custom periods", () => {
    render(<FinanceDashboard data={financeBootstrapMock} />)

    fireEvent.click(screen.getByRole("button", { name: "7 dias" }))
    expect(screen.queryByText("Últimos 6 meses")).not.toBeInTheDocument()
    expect(screen.getByText("Variação no período")).toBeInTheDocument()
    expect(screen.getByText("Patrimônio atual", { exact: false })).toBeInTheDocument()
    expect(screen.getAllByText("R$ 128,00").length).toBeGreaterThan(0)
    expect(screen.getAllByText("R$ 1.050,85").length).toBeGreaterThan(0)
    expect(screen.getAllByText("−R$ 922,85").length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole("button", { name: "Personalizado" }))
    fireEvent.click(screen.getByRole("button", { name: "Data inicial" }))
    fireEvent.click(screen.getByRole("gridcell", { name: "5 de julho de 2026" }))
    fireEvent.click(screen.getByRole("button", { name: "Data final" }))
    fireEvent.click(screen.getByRole("gridcell", { name: "12 de julho de 2026" }))

    expect(screen.getAllByText("05 de jul. – 12 de jul.").length).toBeGreaterThan(0)
    expect(screen.getAllByText("R$ 7.292,50").length).toBeGreaterThan(0)
    expect(screen.getAllByText("R$ 2.570,20").length).toBeGreaterThan(0)
  })
})
