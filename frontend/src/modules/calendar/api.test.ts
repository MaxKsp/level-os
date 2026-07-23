import { afterEach, describe, expect, it, vi } from "vitest"
import { disconnectCalendar, loadCalendarRange, startCalendarConnection } from "./api"
import type { CalendarRange } from "./contracts"

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  delete window.CSRF_TOKEN
})

describe("calendar api", () => {
  it("lista somente o intervalo solicitado com credenciais da sessão", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({
      connection: { status: "connected", accountEmail: "max@example.com", connectedAt: null, syncedAt: null },
      events: [{ id: "event-1", title: "Agenda", start: "2026-07-18T12:00:00Z", end: "2026-07-18T13:00:00Z", allDay: false, location: null, htmlLink: null, source: "google" }],
    }))
    vi.stubGlobal("fetch", fetchMock)
    const range: CalendarRange = { start: "2026-07-18T00:00:00Z", end: "2026-07-19T00:00:00Z", key: "day" }

    const result = await loadCalendarRange(range)

    const [url, options] = fetchMock.mock.calls[0]
    expect(String(url)).toContain("start=2026-07-18T00%3A00%3A00Z")
    expect(String(url)).toContain("end=2026-07-19T00%3A00%3A00Z")
    expect(options).toMatchObject({ credentials: "same-origin" })
    expect(result.events).toHaveLength(1)
    expect(result.events[0]).toMatchObject({ id: "event-1", source: "google" })
  })

  it("inicia consentimento somente pela rota local assinada e envia CSRF", async () => {
    window.CSRF_TOKEN = "csrf-test"
    const fetchMock = vi.fn().mockResolvedValue(json({ authorizationUrl: "/auth-google-start.php?calendar=nonce-test" }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(startCalendarConnection()).resolves.toBe("/auth-google-start.php?calendar=nonce-test")
    expect(fetchMock).toHaveBeenCalledWith("/api/calendar-connect.php", expect.objectContaining({
      method: "POST",
      credentials: "same-origin",
      headers: expect.objectContaining({ "X-CSRF-Token": "csrf-test" }),
    }))
  })

  it("rejeita URL de consentimento fora do Google e da origem local", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ authorizationUrl: "https://example.com/phishing" }))
    vi.stubGlobal("fetch", fetchMock)
    await expect(startCalendarConnection()).rejects.toMatchObject({ code: "invalid_authorization_url" })
  })

  it("desconecta por POST com CSRF sem receber tokens", async () => {
    window.CSRF_TOKEN = "csrf-test"
    const fetchMock = vi.fn().mockResolvedValue(json({
      ok: true,
      connection: { status: "disconnected", accountEmail: null, connectedAt: null, syncedAt: null },
    }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(disconnectCalendar()).resolves.toMatchObject({ status: "disconnected" })
    expect(fetchMock).toHaveBeenCalledWith("/api/calendar-disconnect.php", expect.objectContaining({ method: "POST" }))
  })

  it("encerra a leitura quando o servidor ultrapassa o tempo limite", async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true })
    }))
    vi.stubGlobal("fetch", fetchMock)
    const range: CalendarRange = { start: "2026-07-18T00:00:00Z", end: "2026-07-19T00:00:00Z", key: "day" }

    const expectation = expect(loadCalendarRange(range)).rejects.toMatchObject({ code: "calendar_timeout", status: 408 })
    await vi.advanceTimersByTimeAsync(15_000)

    await expectation
  })
})
