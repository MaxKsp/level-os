import { describe, expect, it } from "vitest"
import { countTimelineByDate } from "../modules/calendar/selectors"
import { buildScheduledTask } from "../modules/routine/TaskSchedulerForm"
import { taskOccurrenceDates, taskRepeatLabel, tasksOn } from "../modules/routine/selectors"

describe("recorrência de tarefas", () => {
  it("cria um único agendamento diário e projeta suas ocorrências", () => {
    const task = buildScheduledTask({
      title: "  Tomar medicamento  ",
      time: "08:00",
      subtitle: "Saúde",
      date: "2026-07-20",
      repeat: "daily",
      repeatDays: [],
    }, "task-medicine")

    expect(task.title).toBe("Tomar medicamento")
    expect(task.repeatDays).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(taskOccurrenceDates(task, "2026-07-20", "2026-07-24")).toEqual([
      "2026-07-20",
      "2026-07-21",
      "2026-07-22",
      "2026-07-23",
    ])
  })

  it("respeita dias personalizados, início e data final", () => {
    const task = buildScheduledTask({
      title: "Academia",
      time: "19:00",
      subtitle: "Saúde",
      date: "2026-07-20",
      repeat: "custom",
      repeatDays: [3, 1, 3],
      repeatUntil: "2026-07-29",
    }, "task-gym")

    expect(task.repeatDays).toEqual([1, 3])
    expect(taskRepeatLabel(task)).toBe("Seg, Qua")
    expect(taskOccurrenceDates(task, "2026-07-19", "2026-08-02")).toEqual([
      "2026-07-20",
      "2026-07-22",
      "2026-07-27",
      "2026-07-29",
    ])
  })

  it("mantém a conclusão independente para cada dia", () => {
    const task = {
      ...buildScheduledTask({
        title: "Alongar",
        time: "07:00",
        subtitle: "Bem-estar",
        date: "2026-07-20",
        repeat: "daily",
        repeatDays: [],
      }, "task-stretch"),
      completedDates: ["2026-07-21"],
    }

    expect(tasksOn([task], "2026-07-21")[0]?.completed).toBe(true)
    expect(tasksOn([task], "2026-07-22")[0]?.completed).toBe(false)
  })

  it("contabiliza as ocorrências sem duplicar o registro persistido", () => {
    const task = buildScheduledTask({
      title: "Planejar o dia",
      time: "08:30",
      subtitle: "Produtividade",
      date: "2026-07-20",
      repeat: "weekdays",
      repeatDays: [],
    }, "task-plan")

    const counts = countTimelineByDate([task], [], undefined, "2026-07-20", "2026-07-27")

    expect([...counts.entries()]).toEqual([
      ["2026-07-20", 1],
      ["2026-07-21", 1],
      ["2026-07-22", 1],
      ["2026-07-23", 1],
      ["2026-07-24", 1],
    ])
  })
})
