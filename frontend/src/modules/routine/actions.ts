import type { Task } from "./contracts"

const pad = (value: number) => String(value).padStart(2, "0")
const isoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const isoTime = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`

function occurrenceDateTime(date: string, time: string): Date {
  const parsed = new Date(`${date}T${time}:00`)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

function withoutOccurrence(task: Task, occurrenceDate: string): Task {
  return {
    ...task,
    excludedDates: [...new Set([...(task.excludedDates ?? []), occurrenceDate])].sort(),
  }
}

export function skipTaskOccurrence(tasks: Task[], taskId: string, occurrenceDate: string): Task[] {
  return tasks.flatMap((task) => {
    if (task.id !== taskId) return [task]
    if (!task.repeat || task.repeat === "none") return []
    return [withoutOccurrence(task, occurrenceDate)]
  })
}

export function snoozeTaskOccurrence(
  tasks: Task[],
  taskId: string,
  occurrenceDate: string,
  delay: number | "tomorrow",
  generatedId = `task_snooze_${Date.now()}`,
): Task[] {
  return tasks.flatMap((task) => {
    if (task.id !== taskId) return [task]
    const scheduled = occurrenceDateTime(occurrenceDate, task.time)
    if (delay === "tomorrow") scheduled.setDate(scheduled.getDate() + 1)
    else scheduled.setMinutes(scheduled.getMinutes() + delay)

    if (!task.repeat || task.repeat === "none") {
      return [{ ...task, date: isoDate(scheduled), time: isoTime(scheduled), completed: false }]
    }

    const schedule = withoutOccurrence(task, occurrenceDate)
    const snoozed: Task = {
      ...task,
      id: generatedId,
      date: isoDate(scheduled),
      time: isoTime(scheduled),
      completed: false,
      repeat: "none",
      repeatDays: undefined,
      repeatUntil: undefined,
      completedDates: undefined,
      excludedDates: undefined,
      paused: false,
      sourceScheduleId: task.id,
    }
    return [schedule, snoozed]
  })
}

export function setTaskSchedulePaused(tasks: Task[], taskId: string, paused: boolean): Task[] {
  return tasks.map((task) => task.id === taskId ? { ...task, paused } : task)
}

export function deleteTaskSeries(tasks: Task[], taskId: string): Task[] {
  return tasks.filter((task) => task.id !== taskId && task.sourceScheduleId !== taskId)
}

export function deleteFutureTaskOccurrences(tasks: Task[], taskId: string, occurrenceDate: string): Task[] {
  const boundary = occurrenceDateTime(occurrenceDate, "12:00")
  boundary.setDate(boundary.getDate() - 1)
  const repeatUntil = isoDate(boundary)

  return tasks.flatMap((task) => {
    if (task.id !== taskId) return [task]
    if (!task.repeat || task.repeat === "none" || !task.date || occurrenceDate <= task.date) return []
    return [{
      ...task,
      repeatUntil,
      completedDates: (task.completedDates ?? []).filter((date) => date < occurrenceDate),
      excludedDates: (task.excludedDates ?? []).filter((date) => date < occurrenceDate),
    }]
  })
}
