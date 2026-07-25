import { describe, expect, it } from "vitest"
import type { BodyMeasurement } from "./contracts"
import { ageFromBirthDate, computeBodyIndices, measurementSeries } from "./bodyIndices"

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

  it("calcula TMB e estima gordura por fórmula quando há idade e sexo", () => {
    const rows = [
      measurement("weight", "peso", 75, "2026-03-01", "kg"),
      measurement("height", "altura", 180, "2026-03-01", "cm"),
    ]
    const result = computeBodyIndices(rows, { age: 30, sex: "m" })
    // Mifflin-St Jeor homem: 10*75 + 6.25*180 - 5*30 + 5 = 1730
    expect(result.bmr?.value).toBe(1730)
    // Deurenberg homem: 1.2*IMC(23.15) + 0.23*30 - 10.8 - 5.4 ≈ 18.48%
    expect(result.composition?.estimated).toBe(true)
    expect(result.composition?.fatPct).toBeCloseTo(18.48, 1)
  })

  it("prefere a gordura medida à estimativa por fórmula", () => {
    const rows = [
      measurement("weight", "peso", 75, "2026-03-01", "kg"),
      measurement("height", "altura", 180, "2026-03-01", "cm"),
      measurement("fat", "gordura", 12, "2026-03-01", "%"),
    ]
    const result = computeBodyIndices(rows, { age: 30, sex: "m" })
    expect(result.composition).toMatchObject({ fatPct: 12, estimated: false })
  })

  it("não estima composição nem TMB sem idade/sexo", () => {
    const rows = [
      measurement("weight", "peso", 75, "2026-03-01", "kg"),
      measurement("height", "altura", 180, "2026-03-01", "cm"),
    ]
    const result = computeBodyIndices(rows, { age: null, sex: "" })
    expect(result.bmr).toBeNull()
    expect(result.composition).toBeNull()
  })

  it("deriva idade da data de nascimento", () => {
    const now = new Date(2026, 6, 20)
    expect(ageFromBirthDate("1996-07-20", now)).toBe(30)
    expect(ageFromBirthDate("1996-07-21", now)).toBe(29) // aniversário ainda não chegou
    expect(ageFromBirthDate("", now)).toBeNull()
    expect(ageFromBirthDate("2030-01-01", now)).toBeNull() // futuro
    expect(ageFromBirthDate("1996-02-31", now)).toBeNull()
    expect(ageFromBirthDate("1996-13-01", now)).toBeNull()
  })

  it("não aplica fórmulas corporais de adulto a menores", () => {
    const rows = [
      measurement("weight", "peso", 55, "2026-03-01", "kg"),
      measurement("height", "altura", 165, "2026-03-01", "cm"),
    ]
    const result = computeBodyIndices(rows, { age: 17, sex: "f" })
    expect(result.bmr).toBeNull()
    expect(result.composition).toBeNull()
  })
})
