import { describe, expect, it } from "vitest"
import type { Task } from "./contracts"
import { routineFocus } from "./routineFocus"

const base = (id: string, time: string, extra: Partial<Task> = {}): Task =>
  ({ id, time, title: id, subtitle: "", completed: false, date: "2026-09-29", ...extra })
describe("routineFocus", () => {
  it("detecta apenas conflitos de tarefas pendentes e ordena prioridade", () => {
    const plan = routineFocus([
      base("baixo", "10:00", { durationMin: 45, priority: "baixa" }),
      base("alto", "10:30", { durationMin: 30, priority: "alta" }),
      base("pronto", "10:30", { completed: true }),
    ], "2026-09-29", "2026-09-29")
    expect(plan.pending.map((item) => item.id)).toEqual(["alto", "baixo"])
    expect(plan.conflicts).toHaveLength(1)
    expect(plan.completed).toBe(1)
  })
  it("respeita recorrência, pausa e exclusões no mapa de sete dias", () => {
    const plan = routineFocus([
      base("diária", "08:00", { date: "2026-09-28", repeat: "daily", excludedDates: ["2026-09-30"] }),
      base("pausada", "09:00", { date: "2026-09-28", repeat: "daily", paused: true }),
    ], "2026-09-29", "2026-09-29")
    expect(plan.week.map((day) => day.total)).toEqual([1, 1, 0, 1, 1, 1, 1])
  })
})
