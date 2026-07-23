import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ProgressProvider, useProgress } from "../modules/progress/store"

function ProgressProbe() {
  const { progress, status, lastDelta, feedback, awardEvent } = useProgress()
  return <div>
    <span data-testid="xp">{progress.xp}</span>
    <span data-testid="status">{status}</span>
    <span data-testid="delta">{lastDelta ?? 0}</span>
    <span data-testid="feedback">{feedback ? `${feedback.type}:${feedback.delta}` : "none"}</span>
    <button onClick={() => void awardEvent("rotina", "rotina:2026-07-17:task-1")}>Concluir</button>
  </div>
}

describe("ProgressProvider", () => {
  it("aplica XP local uma vez por referência", () => {
    render(<ProgressProvider><ProgressProbe /></ProgressProvider>)

    expect(screen.getByTestId("status")).toHaveTextContent("local")
    expect(screen.getByTestId("xp")).toHaveTextContent("5920")

    fireEvent.click(screen.getByText("Concluir"))
    expect(screen.getByTestId("xp")).toHaveTextContent("5940")
    expect(screen.getByTestId("delta")).toHaveTextContent("20")
    expect(screen.getByTestId("feedback")).toHaveTextContent("rotina:20")

    fireEvent.click(screen.getByText("Concluir"))
    expect(screen.getByTestId("xp")).toHaveTextContent("5940")
  })
})
