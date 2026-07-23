import {
  DISCONNECTED_CALENDAR,
  type CalendarRange,
  type GoogleCalendarConnection,
  type GoogleCalendarConnectionStatus,
  type GoogleCalendarEvent,
  type GoogleCalendarResponse,
} from "./contracts"

export class CalendarApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message)
    this.name = "CalendarApiError"
  }
}

const CALENDAR_REQUEST_TIMEOUT_MS = 15_000

export function hasCalendarBackend(): boolean {
  return typeof window !== "undefined" && Boolean(window.CSRF_TOKEN)
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function connectionStatus(value: unknown): GoogleCalendarConnectionStatus {
  return value === "connected" || value === "reconnect_required"
    ? value
    : "disconnected"
}

function parseConnection(value: unknown): GoogleCalendarConnection {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DISCONNECTED_CALENDAR
  }
  const record = value as Record<string, unknown>
  return {
    status: connectionStatus(record.status),
    accountEmail: text(record.accountEmail),
    connectedAt: text(record.connectedAt),
    syncedAt: text(record.syncedAt),
  }
}

function parseEvent(value: unknown): GoogleCalendarEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const id = text(record.id)
  const start = text(record.start)
  const end = text(record.end)
  if (!id || !start || !end) return null
  return {
    id,
    title: text(record.title) ?? "Sem título",
    start,
    end,
    allDay: record.allDay === true,
    location: text(record.location),
    htmlLink: text(record.htmlLink),
    source: "google",
    readOnly: true,
  }
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const body = await response.json().catch(() => null) as Record<string, unknown> | null
  if (!response.ok || !body) {
    const code = text(body?.error) ?? `http_${response.status}`
    const message = text(body?.message) ?? (
      code === "calendar_reconnect_required"
        ? "A autorização do Google expirou. Reconecte sua conta."
        : "Não foi possível acessar o Google Calendar."
    )
    throw new CalendarApiError(message, code, response.status)
  }
  return body
}

async function calendarFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  externalSignal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController()
  const abortFromCaller = () => controller.abort(externalSignal?.reason)
  if (externalSignal?.aborted) abortFromCaller()
  else externalSignal?.addEventListener("abort", abortFromCaller, { once: true })
  const timeout = window.setTimeout(() => controller.abort("calendar_timeout"), CALENDAR_REQUEST_TIMEOUT_MS)

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } catch (cause) {
    if (controller.signal.aborted && !externalSignal?.aborted) {
      throw new CalendarApiError(
        "O Google Calendar demorou para responder. Tente novamente.",
        "calendar_timeout",
        408,
      )
    }
    throw cause
  } finally {
    window.clearTimeout(timeout)
    externalSignal?.removeEventListener("abort", abortFromCaller)
  }
}

function parseResponse(body: Record<string, unknown>): GoogleCalendarResponse {
  const events = Array.isArray(body.events)
    ? body.events.flatMap((item) => {
        const parsed = parseEvent(item)
        return parsed ? [parsed] : []
      })
    : []
  return { connection: parseConnection(body.connection), events }
}

export async function loadCalendarConnection(signal?: AbortSignal): Promise<GoogleCalendarConnection> {
  const response = await calendarFetch("/api/calendar.php", {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  }, signal)
  return parseResponse(await readJson(response)).connection
}

export async function loadCalendarRange(
  range: CalendarRange,
  signal?: AbortSignal,
): Promise<GoogleCalendarResponse> {
  const query = new URLSearchParams({ start: range.start, end: range.end })
  const response = await calendarFetch(`/api/calendar.php?${query.toString()}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  }, signal)
  return parseResponse(await readJson(response))
}

function mutation(path: string): Promise<Record<string, unknown>> {
  return calendarFetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-CSRF-Token": window.CSRF_TOKEN ?? "",
    },
    body: "{}",
  }).then(readJson)
}

export async function startCalendarConnection(): Promise<string> {
  const body = await mutation("/api/calendar-connect.php")
  const authorizationUrl = text(body.authorizationUrl)
  if (!authorizationUrl) {
    throw new CalendarApiError("O servidor não retornou a autorização do Google.", "invalid_authorization_url", 502)
  }
  let parsed: URL
  try {
    parsed = new URL(authorizationUrl, window.location.origin)
  } catch {
    throw new CalendarApiError("O servidor retornou uma autorização inválida.", "invalid_authorization_url", 502)
  }
  const localStart = parsed.origin === window.location.origin
    && parsed.pathname === "/auth-google-start.php"
    && Boolean(parsed.searchParams.get("calendar"))
  if (!localStart) {
    throw new CalendarApiError("O servidor retornou uma autorização não confiável.", "invalid_authorization_url", 502)
  }
  return `${parsed.pathname}${parsed.search}`
}

export async function disconnectCalendar(): Promise<GoogleCalendarConnection> {
  const body = await mutation("/api/calendar-disconnect.php")
  return parseConnection(body.connection)
}
