import { describe, expect, it } from "vitest"
import {
  deleteFutureTaskOccurrences,
  deleteTaskSeries,
  setTaskSchedulePaused,
  skipTaskOccurrence,
  snoozeTaskOccurrence,
} from "../modules/routine/actions"
import type { Task } from "../modules/routine/contracts"
import { routineConsistency, taskOccurrenceDates } from "../modules/routine/selectors"

const dailyTask = (overrides: Partial<Task> = {}): Task => ({
  id: "daily",
  title: "Planejar o dia",
  subtitle: "Rotina",
  time: "08:00",
  date: "2026-07-20",
  completed: false,
  repeat: "daily",
  repeatDays: [0, 1, 2, 3, 4, 5, 6],
  completedDates: [],
  reminderMinutes: [0, 10],
  ...overrides,
})

describe("ações da agenda inteligente", () => {
  it("pula somente a ocorrência escolhida", () => {
    const [task] = skipTaskOccurrence([dailyTask()], "daily", "2026-07-22")

    expect(task.excludedDates).toEqual(["2026-07-22"])
    expect(taskOccurrenceDates(task, "2026-07-21", "2026-07-24")).toEqual([
      "2026-07-21",
      "2026-07-23",
    ])
  })

  it("adia uma ocorrência sem duplicar a série recorrente", () => {
    const result = snoozeTaskOccurrence([dailyTask()], "daily", "2026-07-22", 60, "snoozed")

    expect(result).toHaveLength(2)
    expect(result[0].excludedDates).toEqual(["2026-07-22"])
    expect(result[1]).toMatchObject({
      id: "snoozed",
      date: "2026-07-22",
      time: "09:00",
      repeat: "none",
      sourceScheduleId: "daily",
    })
  })

  it("pausa, encerra ocorrências futuras e exclui série com seus adiamentos", () => {
    const paused = setTaskSchedulePaused([dailyTask()], "daily", true)
    expect(paused[0].paused).toBe(true)

    const ended = deleteFutureTaskOccurrences(paused, "daily", "2026-07-24")
    expect(ended[0].repeatUntil).toBe("2026-07-23")

    const withSnooze = [...ended, { ...dailyTask(), id: "snooze", repeat: "none" as const, sourceScheduleId: "daily" }]
    expect(deleteTaskSeries(withSnooze, "daily")).toEqual([])
  })

  it("calcula consistência e sequência somente com ocorrências planejadas", () => {
    const metrics = routineConsistency([
      dailyTask({ completedDates: ["2026-07-20", "2026-07-21", "2026-07-22"] }),
    ], "2026-07-20", "2026-07-23", "2026-07-22")

    expect(metrics).toEqual({
      planned: 3,
      completed: 3,
      percent: 100,
      currentStreak: 3,
    })
  })
})
