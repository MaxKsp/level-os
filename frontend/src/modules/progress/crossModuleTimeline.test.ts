import { describe, expect, it } from "vitest"
import { financeBootstrapMock } from "../finance/mock"
import type { Task } from "../routine/contracts"
import type { TrainingSessionLog } from "../training/contracts"
import type { ProgressState } from "./contracts"
import { crossModuleTimeline } from "./crossModuleTimeline"

const task: Task = { id: "r1", title: "Ler", subtitle: "", time: "08:00", completed: false,
  date: "2026-09-27", repeat: "daily", completedDates: ["2026-09-28"], excludedDates: ["2026-09-29"] }
const session: TrainingSessionLog = { id: "t1", workoutId: "w1", name: "Superior", date: "2026-09-28",
  modality: "forca", exercises: [{ name: "Supino", modality: "forca", sets: 1, reps: 10, loadKg: 50 }] }
const progress: ProgressState = { level: 1, title: "Início", xp: 80, xp_into_level: 80, xp_to_next: 120,
  progress_pct: 40, streak: 1, updated_at: null,
  achievements: [{ code: "one", title: "Primeiro treino", description: "", xp_bonus: 80, icon: "", unlocked: true,
    unlocked_at: "2026-09-28T10:00:00Z", category: "treino", current: 1, goal: 1 }],
}
describe("crossModuleTimeline", () => {
  it("agrega eventos datados sem transformar pendências em concluídos", () => {
    const events = crossModuleTimeline({ tasks: [task], sessions: [session],
      finance: { ...financeBootstrapMock, expense_lines_v4: [] }, nutrition: null, progress }, "2026-09-29")
    expect(events.map((item) => item.title)).toContain("Tarefa concluída")
    expect(events.map((item) => item.title)).toContain("Treino registrado")
    expect(events.map((item) => item.title)).toContain("Conquista desbloqueada")
    expect(events.find((item) => item.id === "routine-2026-09-29-r1")).toBeUndefined()
  })
  it("omite conquistas sem timestamp e registros futuros", () => {
    const future = { ...session, id: "future", date: "2026-10-10" }
    const noDate = { ...progress, achievements: [{ ...progress.achievements[0], unlocked_at: null }] }
    const events = crossModuleTimeline({ tasks: [], sessions: [future],
      finance: { ...financeBootstrapMock, expense_lines_v4: [] }, nutrition: null, progress: noDate }, "2026-09-29")
    expect(events).toEqual([])
  })
})
