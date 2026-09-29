import type { Task } from "./contracts"
import { tasksOn } from "./selectors"
const DAY = 86_400_000
const addIso = (iso: string, offset: number) => new Date(Date.parse(iso + "T12:00:00Z") + offset * DAY).toISOString().slice(0, 10)
const taskMinute = (time: string): number | null => {
  const match = /^(\d{2}):(\d{2})$/.exec(time)
  if (!match) return null
  const h = Number(match[1]); const m = Number(match[2])
  return h >= 0 && h < 24 && m >= 0 && m < 60 ? h * 60 + m : null
}
const priorityWeight = { alta: 0, media: 1, baixa: 2 }
export function routineFocus(tasks: Task[], date: string, fallbackDate: string) {
  const current = tasksOn(tasks, date, fallbackDate)
  const pending = current.filter((task) => !task.completed).sort((a, b) =>
    (priorityWeight[a.priority ?? "media"] - priorityWeight[b.priority ?? "media"]) || a.time.localeCompare(b.time))
  const intervals = pending.flatMap((task) => {
    const start = taskMinute(task.time)
    if (start === null) return []
    return [{ task, start, end: Math.min(1440, start + (Number.isFinite(task.durationMin) && (task.durationMin ?? 0) > 0 ? task.durationMin! : 30)) }]
  })
  const conflicts: Array<{ left: Task; right: Task }> = []
  for (let i = 0; i < intervals.length; i++) for (let j = i + 1; j < intervals.length; j++) {
    const left = intervals[i]; const right = intervals[j]
    if (left.start < right.end && right.start < left.end) conflicts.push({ left: left.task, right: right.task })
  }
  const weekday = new Date(date + "T12:00:00Z").getUTCDay()
  const monday = addIso(date, -(weekday + 6) % 7)
  const week = Array.from({ length: 7 }, (_, index) => {
    const iso = addIso(monday, index)
    const occurrences = tasksOn(tasks, iso, fallbackDate)
    return { date: iso, total: occurrences.length, completed: occurrences.filter((task) => task.completed).length }
  })
  return { date, pending, conflicts, week, completed: current.length - pending.length, total: current.length }
}
