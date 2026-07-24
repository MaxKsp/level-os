import { describe, expect, it } from "vitest"
import type { BodyMeasurement } from "./contracts"
import { computeBodyIndices, measurementSeries } from "./bodyIndices"

const measurement = (
  id: string,
  type: BodyMeasurement["type"],
  value: number,
  date: string,
  unit: BodyMeasurement["unit"],
): BodyMeasurement => ({ id, type, value, date, unit, source: "manual" })

describe("body indices", () => {
  it("usa as medidas mais recentes mesmo quando a entrada está fora de ordem", () => {
    const rows = [
      measurement("old-weight", "peso", 80, "2026-01-01", "kg"),
      measurement("fat", "gordura", 20, "2026-03-01", "%"),
      measurement("height", "altura", 180, "2026-03-01", "cm"),
      measurement("new-weight", "peso", 75, "2026-03-01", "kg"),
    ]

    const result = computeBodyIndices(rows)
    expect(result.bmi?.value).toBeCloseTo(23.15, 2)
    expect(result.weightDelta).toMatchObject({ value: -5, sinceDate: "2026-01-01" })
    expect(result.composition).toMatchObject({ fatMass: 15, leanMass: 60, fatPct: 20 })
    expect(result.waterTarget).toMatchObject({ liters: 2.625, basedOnKg: 75 })
  })

  it("ordena a série temporal do registro mais antigo ao mais novo", () => {
    const rows = [
      measurement("new", "peso", 75, "2026-03-01", "kg"),
      measurement("old", "peso", 80, "2026-01-01", "kg"),
      measurement("middle", "peso", 78, "2026-02-01", "kg"),
    ]

    expect(measurementSeries(rows, "peso").values).toEqual([80, 78, 75])
  })
})
