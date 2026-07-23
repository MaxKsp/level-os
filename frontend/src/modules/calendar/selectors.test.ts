import { describe, expect, it } from "vitest"
import type { Task } from "../routine/contracts"
import type { GoogleCalendarEvent } from "./contracts"
import {
  calendarRangeForView,
  countTimelineByDate,
  localIsoDate,
  safeGoogleCalendarUrl,
  timelineOnDate,
} from "./selectors"

const task: Task = {
  id: "task-1",
  date: "2026-07-18",
  time: "10:00",
  title: "Tarefa Level",
  subtitle: "Rotina",
  completed: false,
}

function event(overrides: Partial<GoogleCalendarEvent>): GoogleCalendarEvent {
  return {
    id: "google-1",
    title: "Evento Google",
    start: new Date(2026, 6, 18, 9).toISOString(),
    end: new Date(2026, 6, 18, 10).toISOString(),
    allDay: false,
    location: null,
    htmlLink: "https://calendar.google.com/calendar/event?eid=abc",
    source: "google",
    readOnly: true,
    ...overrides,
  }
}

describe("calendar selectors", () => {
  it.each([
    ["dia", "2026-07-18", "2026-07-19"],
    ["semana", "2026-07-13", "2026-07-20"],
    ["mes", "2026-07-01", "2026-08-01"],
    ["ano", "2026-01-01", "2027-01-01"],
  ] as const)("calcula intervalo %s com fim exclusivo", (view, expectedStart, expectedEnd) => {
    const range = calendarRangeForView(view, new Date(2026, 6, 18, 12))
    expect(localIsoDate(new Date(range.start))).toBe(expectedStart)
    expect(localIsoDate(new Date(range.end))).toBe(expectedEnd)
  })

  it("mescla dia inteiro, evento com horário e tarefa sem tornar Google editável", () => {
    const items = timelineOnDate([
      task,
    ], [
      event({ id: "timed", title: "Evento às nove" }),
      event({ id: "all-day", title: "Evento do dia", start: "2026-07-18", end: "2026-07-19", allDay: true }),
    ], "2026-07-18")

    expect(items.map((item) => item.source === "level" ? item.task.title : item.event.title)).toEqual([
      "Evento do dia",
      "Evento às nove",
      "Tarefa Level",
    ])
    expect(items[0]).toMatchObject({ source: "google", allDay: true })
    expect(items[2]).toMatchObject({ source: "level", allDay: false })
  })

  it("conta evento que atravessa dois dias em ambos, respeitando o fim exclusivo", () => {
    const overnight = event({
      start: new Date(2026, 6, 18, 22).toISOString(),
      end: new Date(2026, 6, 19, 1).toISOString(),
    })
    const allDay = event({ id: "all-day", start: "2026-07-20", end: "2026-07-21", allDay: true })
    const counts = countTimelineByDate([task], [overnight, allDay])

    expect(counts.get("2026-07-18")).toBe(2)
    expect(counts.get("2026-07-19")).toBe(1)
    expect(counts.get("2026-07-20")).toBe(1)
    expect(counts.has("2026-07-21")).toBe(false)
  })

  it("aceita apenas links HTTPS do Google", () => {
    expect(safeGoogleCalendarUrl("https://calendar.google.com/calendar/event?eid=abc")).toContain("calendar.google.com")
    expect(safeGoogleCalendarUrl("http://calendar.google.com/calendar/event?eid=abc")).toBeNull()
    expect(safeGoogleCalendarUrl("https://example.com/event")).toBeNull()
  })
})
