import { describe, expect, it } from "vitest"
import type { TrainingSessionLog } from "./contracts"
import { sessionVolume, trainingAnalytics } from "./trainingAnalytics"

function session(date: string, loadKg = 50, durationSec = 1800): TrainingSessionLog {
  return {
    id: `s-${date}-${loadKg}`, date, workoutId: null,
    name: "Treino de força", modality: "forca", durationSec: durationSec, source: "manual",
    exercises: [{ name: "Agachamento", modality: "forca", sets: 3, reps: 10, loadKg }],
  }
}

describe("training performance analytics", () => {
  it("separa a semana atual da anterior e usa os dados reais das sessões", () => {
    const actual = trainingAnalytics([
      session("2026-09-25", 45), session("2026-09-28", 50, 3600), session("2026-09-28", 60),
    ], "2026-09-28")
    expect(actual.weekCount).toBe(2)
    expect(actual.previousWeekCount).toBe(1)
    expect(actual.weekVolumeKg).toBe(3300)
    expect(actual.weekMinutes).toBe(90)
    expect(actual.activeDays28).toBe(2)
    expect(actual.personalBest).toEqual({ name: "Agachamento", load: 60 })
    expect(actual.trend.at(-1)?.count).toBe(2)
  })
  it("não apresenta dados fictícios quando não existem registros", () => {
    const value = trainingAnalytics([], "2026-09-28")
    expect(value.weekCount).toBe(0)
    expect(value.weekVolumeKg).toBe(0)
    expect(value.trend).toHaveLength(7)
    expect(value.personalBest).toBeNull()
    expect(value.lastSession).toBeNull()
  })
  it("não conta sessões futuras ou datas impossíveis", () => {
    const value = trainingAnalytics([
      session("2026-09-29"), session("2026-02-30"), session("2026-09-28"),
    ], "2026-09-28")
    expect(value.weekCount).toBe(1)
    expect(value.activeDays28).toBe(1)
  })
  it("calcula volume apenas de exercício de força com carga", () => {
    const cardio = { ...session("2026-09-28"), exercises: [
      { name: "Corrida", modality: "cardio" as const, durationSec: 1200, distanceKm: 3 },
    ] }
    expect(sessionVolume(cardio)).toBe(0)
  })
})
