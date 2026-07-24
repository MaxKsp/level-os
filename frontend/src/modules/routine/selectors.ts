import type { Priority, Task } from "./contracts"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function parseIsoDate(value: string): Date | null {
  if (!ISO_DATE.test(value)) return null
  const [year, month, day] = value.split("-").map(Number)
  const parsed = new Date(year, month - 1, day)
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day
    ? parsed
    : null
}

function localIsoDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")
}

export function taskOccursOn(task: Task, isoDate: string, fallbackIso?: string): boolean {
  if (task.paused || (task.excludedDates ?? []).includes(isoDate)) return false
  const repeat = task.repeat ?? "none"
  const startIso = task.date ?? fallbackIso
  if (repeat === "none") return startIso === isoDate
  if (!startIso || isoDate < startIso || (task.repeatUntil && isoDate > task.repeatUntil)) return false
  const date = parseIsoDate(isoDate)
  const start = parseIsoDate(startIso)
  if (!date || !start) return false
  if (repeat === "daily") return true
  if (repeat === "weekdays") return date.getDay() >= 1 && date.getDay() <= 5
  if (repeat === "weekly") return date.getDay() === start.getDay()
  return (task.repeatDays ?? []).includes(date.getDay())
}

export function taskOnDate(task: Task, isoDate: string, fallbackIso?: string): Task | null {
  if (!taskOccursOn(task, isoDate, fallbackIso)) return null
  const recurring = Boolean(task.repeat && task.repeat !== "none")
  return {
    ...task,
    date: isoDate,
    completed: recurring ? (task.completedDates ?? []).includes(isoDate) : task.completed,
  }
}

export function taskRepeatLabel(task: Task): string | null {
  if (!task.repeat || task.repeat === "none") return null
  if (task.repeat === "daily") return "Todos os dias"
  if (task.repeat === "weekdays") return "Dias úteis"
  if (task.repeat === "weekly") return "Toda semana"
  const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
  const days = [...new Set(task.repeatDays ?? [])].sort((a, b) => a - b)
  return days.length ? days.map((day) => labels[day]).join(", ") : "Personalizado"
}

export interface RoutineConsistency {
  planned: number
  completed: number
  percent: number
  currentStreak: number
}

export function routineConsistency(
  tasks: Task[],
  startIso: string,
  endIsoExclusive: string,
  todayIso: string,
): RoutineConsistency {
  const occurrenceByDate = new Map<string, Task[]>()
  for (const task of tasks) {
    for (const date of taskOccurrenceDates(task, startIso, endIsoExclusive)) {
      const list = occurrenceByDate.get(date) ?? []
      list.push(task)
      occurrenceByDate.set(date, list)
    }
  }

  let planned = 0
  let completed = 0
  for (const [date, entries] of occurrenceByDate) {
    if (date > todayIso) continue
    planned += entries.length
    completed += entries.filter((task) => task.repeat && task.repeat !== "none"
      ? (task.completedDates ?? []).includes(date)
      : task.completed).length
  }

  let currentStreak = 0
  const cursor = parseIsoDate(todayIso)
  if (cursor) {
    for (let guard = 0; guard < 366; guard += 1) {
      const date = localIsoDate(cursor)
      const entries = occurrenceByDate.get(date) ?? []
      if (entries.length === 0) {
        cursor.setDate(cursor.getDate() - 1)
        continue
      }
      const done = entries.every((task) => task.repeat && task.repeat !== "none"
        ? (task.completedDates ?? []).includes(date)
        : task.completed)
      if (!done) break
      currentStreak += 1
      cursor.setDate(cursor.getDate() - 1)
    }
  }

  return {
    planned,
    completed,
    percent: progressPercent(completed, planned),
    currentStreak,
  }
}

export function taskOccurrenceDates(
  task: Task,
  startIso: string,
  endIsoExclusive: string,
  fallbackIso?: string,
): string[] {
  const start = parseIsoDate(startIso)
  const end = parseIsoDate(endIsoExclusive)
  if (!start || !end || end <= start) return []
  if (!task.repeat || task.repeat === "none") {
    const date = task.date ?? fallbackIso
    return date && date >= startIso && date < endIsoExclusive ? [date] : []
  }
  const dates: string[] = []
  const cursor = new Date(start)
  let guard = 0
  while (cursor < end && guard < 800) {
    const iso = localIsoDate(cursor)
    if (taskOccursOn(task, iso, fallbackIso)) dates.push(iso)
    cursor.setDate(cursor.getDate() + 1)
    guard += 1
  }
  return dates
}

export function progressPercent(completed: number, total: number): number {
  return total > 0 ? Math.round((completed / total) * 100) : 0
}

export interface RoutineSummary {
  total: number
  completed: number
  pending: number
  progress: number
  nextTask: Task | null
}

export function routineSummary(tasks: Task[]): RoutineSummary {
  const completed = tasks.filter((t) => t.completed).length
  const sorted = [...tasks].sort((a, b) => a.time.localeCompare(b.time))
  const nextTask = sorted.find((t) => !t.completed) ?? null
  return {
    total: tasks.length,
    completed,
    pending: tasks.length - completed,
    progress: progressPercent(completed, tasks.length),
    nextTask,
  }
}

/** Tarefas de uma data ISO (trata data ausente como `fallbackIso`). */
export function tasksOn(tasks: Task[], isoDate: string, fallbackIso?: string): Task[] {
  return tasks
    .map((task) => taskOnDate(task, isoDate, fallbackIso))
    .filter((task): task is Task => task !== null)
    .sort((a, b) => a.time.localeCompare(b.time))
}

/** Contagem de tarefas por dia ISO — base de indicadores de calendário/heatmap. */
export function countByDate(tasks: Task[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const t of tasks) {
    if (!t.date) continue
    m.set(t.date, (m.get(t.date) ?? 0) + 1)
  }
  return m
}

export const PRIORITY_TONE: Record<Priority, string> = {
  alta: "bg-error/15 text-error",
  media: "bg-warning/15 text-warning",
  baixa: "bg-tertiary/15 text-tertiary",
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
}
