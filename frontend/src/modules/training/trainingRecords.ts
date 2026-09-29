import type { TrainingSessionLog } from "./contracts"
export interface PersonalRecord {
  name: string; bestKg: number; bestDate: string; lastKg: number; lastDate: string; observations: number
}
export function personalRecords(sessions: TrainingSessionLog[]): PersonalRecord[] {
  const records = new Map<string, PersonalRecord>()
  const normalize = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR")
  for (const session of [...sessions].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))) {
    for (const entry of session.exercises) {
      if (entry.modality !== "forca" || entry.loadKg == null || !Number.isFinite(entry.loadKg) || entry.loadKg <= 0) continue
      const name = entry.name.trim()
      if (!name) continue
      const key = normalize(name)
      const prior = records.get(key)
      if (!prior) {
        records.set(key, { name, bestKg: entry.loadKg, bestDate: session.date,
          lastKg: entry.loadKg, lastDate: session.date, observations: 1 })
      } else {
        if (entry.loadKg > prior.bestKg) { prior.bestKg = entry.loadKg; prior.bestDate = session.date }
        prior.lastKg = entry.loadKg; prior.lastDate = session.date; prior.observations += 1
      }
    }
  }
  return [...records.values()].sort((a, b) => b.bestKg - a.bestKg || a.name.localeCompare(b.name))
}
export function bestExerciseLoad(sessions: TrainingSessionLog[], name: string): number | null {
  const key = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR")
  const result = personalRecords(sessions).find((item) => item.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("pt-BR") === key)
  return result?.bestKg ?? null
}
