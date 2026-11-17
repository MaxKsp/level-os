import type { TrainingSessionLog } from "./contracts"

const DAY = 86_400_000
function utcDay(iso: string): number { return Date.parse(iso + "T00:00:00Z") }
function addDays(iso: string, days: number): string {
  return new Date(utcDay(iso) + days * DAY).toISOString().slice(0, 10)
}
function validDay(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && Number.isFinite(utcDay(iso)) &&
    new Date(utcDay(iso)).toISOString().slice(0, 10) === iso
}
export function sessionVolume(session: TrainingSessionLog): number {
  return session.exercises.reduce((sum, e) => {
    if (e.modality !== "forca" || !e.loadKg || !e.sets || !e.reps) return sum
    return sum + Math.max(0, e.loadKg) * Math.max(0, e.sets) * Math.max(0, e.reps)
  }, 0)
}

export function trainingAnalytics(sessions: TrainingSessionLog[], today: string) {
  if (!validDay(today)) throw new Error("Data de referência inválida")
  const mondayOffset = (new Date(utcDay(today)).getUTCDay() + 6) % 7
  const weekStart = addDays(today, -mondayOffset)
  const lastWeekStart = addDays(weekStart, -7)
  const lastWeekEnd = addDays(weekStart, -1)
  const valid = sessions.filter((s) => validDay(s.date) && s.date <= today)
  const current = valid.filter((s) => s.date >= weekStart)
  const previous = valid.filter((s) => s.date >= lastWeekStart && s.date <= lastWeekEnd)
  const trend = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6)
    return { date, count: valid.filter((s) => s.date === date).length }
  })
  const recentStart = addDays(today, -27)
  const activeDays28 = new Set(valid.filter((s) => s.date >= recentStart).map((s) => s.date)).size
  const bestByExercise = new Map<string, { name: string; load: number }>()
  for (const session of valid) {
    for (const exercise of session.exercises) {
      if (exercise.modality !== "forca" || !(exercise.loadKg && exercise.loadKg > 0)) continue
      const key = exercise.name.trim().toLocaleLowerCase("pt-BR")
      const best = bestByExercise.get(key)
      if (!best || exercise.loadKg > best.load) bestByExercise.set(key, { name: exercise.name, load: exercise.loadKg })
    }
  }
  const personalBest = [...bestByExercise.values()].sort((a, b) => b.load - a.load)[0] ?? null
  const lastSession = [...valid].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
  return {
    weekCount: current.length,
    previousWeekCount: previous.length,
    weekMinutes: Math.round(current.reduce((sum, s) => sum + (s.durationSec ?? 0), 0) / 60),
    weekVolumeKg: Math.round(current.reduce((sum, s) => sum + sessionVolume(s), 0)),
    activeDays28, trend, personalBest, lastSession,
  }
}
