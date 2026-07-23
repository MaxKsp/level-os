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
    expect(screen.getByText("R$ 128,00")).toBeInTheDocument()
    expect(screen.getByText("R$ 1.050,85")).toBeInTheDocument()
    expect(screen.getAllByText("−R$ 922,85").length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole("button", { name: "Personalizado" }))
    fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2026-07-05" } })
    fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2026-07-12" } })

    expect(screen.getAllByText("05 de jul. – 12 de jul.").length).toBeGreaterThan(0)
    expect(screen.getByText("R$ 7.292,50")).toBeInTheDocument()
    expect(screen.getByText("R$ 2.570,20")).toBeInTheDocument()
  })
})
