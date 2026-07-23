import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { GoogleCalendarSection } from "../modules/calendar/GoogleCalendarSection"
import { CalendarProvider } from "../modules/calendar/store"

afterEach(() => {
  vi.unstubAllGlobals()
  delete window.CSRF_TOKEN
})

describe("GoogleCalendarSection", () => {
  it("mostra a conta conectada sem expor credenciais", async () => {
    window.CSRF_TOKEN = "csrf-test"
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      connection: {
        status: "connected",
        accountEmail: "max@example.com",
        connectedAt: "2026-07-18T12:00:00Z",
        syncedAt: "2026-07-18T13:00:00Z",
      },
      events: [],
    }), { status: 200, headers: { "Content-Type": "application/json" } })))

    render(<CalendarProvider><GoogleCalendarSection /></CalendarProvider>)

    expect(await screen.findByText("max@example.com")).toBeInTheDocument()
    expect(screen.getByText("Conectado")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Desconectar/ })).toBeEnabled()
    expect(screen.queryByText(/access_token|refresh_token/i)).not.toBeInTheDocument()
  })

  it("mantém conexão indisponível no preview sem sessão PHP", () => {
    render(<CalendarProvider><GoogleCalendarSection /></CalendarProvider>)
    expect(screen.getByRole("button", { name: "Conectar Google Calendar" })).toBeDisabled()
    expect(screen.getByText("A conexão fica disponível no aplicativo autenticado.")).toBeInTheDocument()
  })
})
