export type GoogleCalendarConnectionStatus =
  | "connected"
  | "disconnected"
  | "reconnect_required"

export interface GoogleCalendarConnection {
  status: GoogleCalendarConnectionStatus
  accountEmail: string | null
  connectedAt: string | null
  syncedAt: string | null
}

export interface GoogleCalendarEvent {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  location: string | null
  htmlLink: string | null
  source: "google"
  /** Fase 1: o discriminante impede qualquer mutação/XP acidental. */
  readOnly: true
}

export interface GoogleCalendarResponse {
  connection: GoogleCalendarConnection
  events: GoogleCalendarEvent[]
}

export interface CalendarRange {
  /** RFC 3339 instant, inclusive. */
  start: string
  /** RFC 3339 instant, exclusive. */
  end: string
  key: string
}

export type CalendarView = "dia" | "semana" | "mes" | "ano"

export const DISCONNECTED_CALENDAR: GoogleCalendarConnection = {
  status: "disconnected",
  accountEmail: null,
  connectedAt: null,
  syncedAt: null,
}
