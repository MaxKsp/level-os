import { describe, expect, it } from "vitest"
import type { TrainingSessionLog } from "./contracts"
import { bestExerciseLoad, personalRecords } from "./trainingRecords"
const session = (id: string, date: string, loadKg: number, name = "Supino"): TrainingSessionLog => ({
  id, date, workoutId: "w1", name: "Superior", modality: "forca",
  exercises: [{ name, modality: "forca", sets: 1, reps: 8, loadKg }],
})
describe("trainingRecords", () => {
  it("distingue recorde histórico da última carga executada", () => {
    const records = personalRecords([session("b", "2026-09-29", 60), session("a", "2026-09-25", 70)])
    expect(records[0]).toMatchObject({ bestKg: 70, bestDate: "2026-09-25", lastKg: 60, observations: 2 })
  })
  it("compara nomes sem acentos, ignora cargas ausentes e não cria recorde falso", () => {
    const record = session("a", "2026-09-25", 30, "Elevação lateral")
    expect(bestExerciseLoad([record], "elevacao lateral")).toBe(30)
    expect(personalRecords([session("zero", "2026-09-25", 0)])).toEqual([])
  })
})
