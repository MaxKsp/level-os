import { describe, expect, it } from "vitest"
import { financeBootstrapMock } from "./mock"
import { financeTotalsForPeriod, financeTrendForPeriod, resolveFinancePeriod } from "./period"

const reference = new Date(2026, 6, 17)

describe("finance period", () => {
  it("resolves rolling periods and the current month", () => {
    expect(resolveFinancePeriod("7d", "", "", reference)).toMatchObject({ start: "2026-07-11", end: "2026-07-17" })
    expect(resolveFinancePeriod("30d", "", "", reference)).toMatchObject({ start: "2026-06-18", end: "2026-07-17" })
    expect(resolveFinancePeriod("month", "", "", reference)).toMatchObject({ start: "2026-07-01", end: "2026-07-31" })
    expect(resolveFinancePeriod("previous-month", "", "", reference)).toMatchObject({ start: "2026-06-01", end: "2026-06-30" })
    expect(resolveFinancePeriod("6m", "", "", reference)).toMatchObject({ start: "2026-02-01", end: "2026-07-17" })
  })

  it("normalizes an inverted custom interval", () => {
    expect(resolveFinancePeriod("custom", "2026-07-17", "2026-07-01", reference)).toMatchObject({
      start: "2026-07-01",
      end: "2026-07-17",
    })
  })

  it("filters actual movements and recurring income", () => {
    const sevenDays = resolveFinancePeriod("7d", "", "", reference)
    expect(financeTotalsForPeriod(financeBootstrapMock, sevenDays)).toMatchObject({
      recurringIncome: 0,
      variableIncome: 128,
      expenses: 1050.85,
      balance: -922.85,
    })

    const month = resolveFinancePeriod("month", "", "", reference)
    expect(financeTotalsForPeriod(financeBootstrapMock, month)).toMatchObject({
      recurringIncome: 8700,
      variableIncome: 220.5,
      expenses: 2980.75,
      balance: 5939.75,
    })
  })

  it("rebuilds the perspective curve from the selected period", () => {
    const sevenDays = resolveFinancePeriod("7d", "", "", reference)
    const trend = financeTrendForPeriod(financeBootstrapMock, sevenDays, 12_650)

    expect(trend).toHaveLength(7)
    expect(trend[0]).toMatchObject({ date: "2026-07-11", label: "Início", value: 13_572.85 })
    expect(trend.at(-1)).toMatchObject({ date: "2026-07-17", value: 12_650 })
    expect(trend.at(-1)!.value - trend[0].value).toBeCloseTo(-922.85, 2)
  })
})
