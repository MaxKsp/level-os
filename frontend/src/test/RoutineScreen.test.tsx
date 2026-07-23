import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter } from "react-router-dom"
import { AppContextProvider } from "../context/AppContext"
import { CalendarProvider } from "../modules/calendar/store"
import { RoutineScreen } from "../modules/routine/RoutineScreen"
import { progressPercent } from "../modules/routine/selectors"
import { ProgressProvider } from "../modules/progress/store"
import { FinanceProvider } from "../modules/finance/store"
import { TrainingProvider } from "../modules/training/store"
import { NutritionProvider } from "../modules/nutrition/store"
import { AssistantProvider } from "../modules/assistant/store"

const pendingTask = {
  id: "task-alignment",
  time: "14:00",
  title: "Reunião de alinhamento",
  subtitle: "Videochamada",
  completed: false,
}

const renderScreen = () =>
  render(
    <MemoryRouter>
      <ProgressProvider>
        <AppContextProvider>
          <CalendarProvider>
            <FinanceProvider>
              <TrainingProvider>
                <NutritionProvider>
                  <AssistantProvider>
                    <RoutineScreen />
                  </AssistantProvider>
                </NutritionProvider>
              </TrainingProvider>
            </FinanceProvider>
          </CalendarProvider>
        </AppContextProvider>
      </ProgressProvider>
    </MemoryRouter>,
  )

afterEach(() => {
  vi.unstubAllGlobals()
  delete window.CSRF_TOKEN
})

describe("RoutineScreen — Dia/Semana/Mês/Ano", () => {
  it.each([
    [0, 0, 0],
    [0, 4, 0],
    [1, 3, 33],
    [2, 4, 50],
    [4, 4, 100],
  ])("calcula %i de %i como %i%%", (completed, total, expected) => {
    expect(progressPercent(completed, total)).toBe(expected)
  })

  it("abre em Dia com as tarefas do dia", () => {
    renderScreen()
    expect(screen.getByRole("tab", { name: "Dia" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByText("Tarefas do dia")).toBeInTheDocument()
  })

  it("troca de verdade o conteúdo entre as quatro visões", () => {
    renderScreen()

    fireEvent.click(screen.getByRole("tab", { name: "Semana" }))
    expect(screen.getByRole("tab", { name: "Semana" })).toHaveAttribute("aria-selected", "true")
    // grade semanal traz cabeçalhos de dias da semana
    expect(screen.getAllByText("Qua").length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole("tab", { name: "Mês" }))
    expect(screen.getByText("Julho 2026")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("tab", { name: "Ano" }))
    expect(screen.getByText("2026")).toBeInTheDocument()
    expect(screen.getByText("Dezembro")).toBeInTheDocument()
  })

  it("conclui uma tarefa ao clicar (toggle real)", () => {
    localStorage.setItem("level-os:tasks", JSON.stringify([pendingTask]))
    renderScreen()
    const list = screen.getByText("Tarefas do dia").closest("section")!
    const pending = within(list).getByText("Reunião de alinhamento")
    // riscar/marcar: antes não está concluída
    expect(pending.className).not.toContain("line-through")
    fireEvent.click(pending)
    expect(pending.className).toContain("line-through")
  })

  it("mescla evento Google read-only sem oferecer toggle nem XP", async () => {
    window.CSRF_TOKEN = "csrf-test"
    const start = new Date(); start.setHours(13, 0, 0, 0)
    const end = new Date(start); end.setHours(14)
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      const payload = String(url).startsWith("/api/data.php")
        ? { value: [pendingTask] }
        : {
            connection: { status: "connected", accountEmail: "max@example.com", connectedAt: null, syncedAt: null },
            events: [{
              id: "google-readonly",
              title: "Reunião Google",
              start: start.toISOString(),
              end: end.toISOString(),
              allDay: false,
              location: "Meet",
              htmlLink: "https://calendar.google.com/calendar/event?eid=test",
              source: "google",
              readOnly: true,
            }],
          }
      return Promise.resolve(new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } }))
    }))

    renderScreen()

    const googleTitle = await screen.findByText("Reunião Google")
    expect(googleTitle.closest("a")).toHaveAttribute("target", "_blank")
    expect(googleTitle.closest("button")).toBeNull()
    expect(screen.getByText("Reunião de alinhamento").className).not.toContain("line-through")
  })

  it("mostra erro do calendário sem repetir a requisição em loop", async () => {
    window.CSRF_TOKEN = "csrf-test"
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({
      error: "calendar_unavailable",
      message: "Calendário indisponível no momento.",
    }), { status: 500, headers: { "Content-Type": "application/json" } })))
    vi.stubGlobal("fetch", fetchMock)

    renderScreen()

    expect(await screen.findByRole("alert")).toHaveTextContent("Calendário indisponível no momento.")
    await waitFor(() => {
      const calendarCalls = fetchMock.mock.calls.filter(([url]) => String(url).startsWith("/api/calendar.php"))
      expect(calendarCalls).toHaveLength(1)
    })
  })
})
