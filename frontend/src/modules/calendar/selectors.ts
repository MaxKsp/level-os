import type { Task } from "../routine/contracts"
import type { CalendarRange, CalendarView, GoogleCalendarEvent } from "./contracts"

export type TimelineItem =
  | { key: string; source: "level"; task: Task; allDay: false; sortTime: number }
  | { key: string; source: "google"; event: GoogleCalendarEvent; allDay: boolean; sortTime: number }

const pad = (value: number) => String(value).padStart(2, "0")

export function localIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseLocalDate(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function addCalendarDays(date: Date, amount: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

export function calendarWeekStart(date: Date): Date {
  return addCalendarDays(date, -((date.getDay() + 6) % 7))
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function calendarRangeForView(view: CalendarView, cursor: Date): CalendarRange {
  let start: Date
  let end: Date
  if (view === "dia") {
    start = startOfDay(cursor)
    end = addCalendarDays(start, 1)
  } else if (view === "semana") {
    start = calendarWeekStart(startOfDay(cursor))
    end = addCalendarDays(start, 7)
  } else if (view === "mes") {
    start = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  } else {
    start = new Date(cursor.getFullYear(), 0, 1)
    end = new Date(cursor.getFullYear() + 1, 0, 1)
  }
  const startIso = start.toISOString()
  const endIso = end.toISOString()
  return { start: startIso, end: endIso, key: `${view}:${startIso}:${endIso}` }
}

function eventDate(value: string): Date | null {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? parseLocalDate(value)
    : new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function googleEventOnDate(event: GoogleCalendarEvent, isoDate: string): boolean {
  const eventStart = eventDate(event.start)
  const eventEnd = eventDate(event.end)
  if (!eventStart || !eventEnd || eventEnd <= eventStart) return false
  const dayStart = parseLocalDate(isoDate)
  const dayEnd = addCalendarDays(dayStart, 1)
  return eventStart < dayEnd && eventEnd > dayStart
}

function minutesFromTime(value: string): number {
  const [hour, minute] = value.split(":").map(Number)
  return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : 24 * 60
}

function eventMinutes(event: GoogleCalendarEvent): number {
  if (event.allDay) return -1
  const start = eventDate(event.start)
  return start ? start.getHours() * 60 + start.getMinutes() : 24 * 60
}

export function timelineOnDate(
  tasks: Task[],
  events: GoogleCalendarEvent[],
  isoDate: string,
  fallbackIso?: string,
): TimelineItem[] {
  const level: TimelineItem[] = tasks
    .filter((task) => (task.date ?? fallbackIso) === isoDate)
    .map((task) => ({
      key: `level:${task.id}:${isoDate}`,
      source: "level",
      task,
      allDay: false,
      sortTime: minutesFromTime(task.time),
    }))
  const google: TimelineItem[] = events
    .filter((event) => googleEventOnDate(event, isoDate))
    .map((event) => ({
      key: `google:${event.id}:${isoDate}`,
      source: "google",
      event,
      allDay: event.allDay,
      sortTime: eventMinutes(event),
    }))
  return [...level, ...google].sort((left, right) => {
    if (left.allDay !== right.allDay) return left.allDay ? -1 : 1
    if (left.sortTime !== right.sortTime) return left.sortTime - right.sortTime
    return left.key.localeCompare(right.key)
  })
}

export function countTimelineByDate(
  tasks: Task[],
  events: GoogleCalendarEvent[],
  fallbackIso?: string,
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const task of tasks) {
    const date = task.date ?? fallbackIso
    if (date) counts.set(date, (counts.get(date) ?? 0) + 1)
  }
  for (const event of events) {
    const start = eventDate(event.start)
    const end = eventDate(event.end)
    if (!start || !end || end <= start) continue
    let cursor = startOfDay(start)
    let guard = 0
    while (cursor < end && guard < 400) {
      const key = localIsoDate(cursor)
      counts.set(key, (counts.get(key) ?? 0) + 1)
      cursor = addCalendarDays(cursor, 1)
      guard += 1
    }
  }
  return counts
}

export function googleEventTimeLabel(event: GoogleCalendarEvent): string {
  if (event.allDay) return "Dia inteiro"
  const start = eventDate(event.start)
  if (!start) return "Horário indisponível"
  return start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

export function safeGoogleCalendarUrl(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    const googleHost = url.hostname === "google.com" || url.hostname.endsWith(".google.com")
    return url.protocol === "https:" && googleHost ? url.toString() : null
  } catch {
    return null
  }
}
