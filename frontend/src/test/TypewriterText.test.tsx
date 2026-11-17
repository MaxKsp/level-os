import { act, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { TypewriterText } from "../modules/assistant/TypewriterText"

describe("TypewriterText", () => {
  afterEach(() => vi.useRealTimers())

  it("revela visualmente uma resposta nova e mantém o texto acessível completo", () => {
    vi.useFakeTimers()
    const { container } = render(<TypewriterText text="Resposta real da plataforma" animate />)
    const visual = container.querySelector('[aria-hidden="true"]')
    expect(visual).toHaveTextContent("")
    expect(screen.getByRole("status")).toHaveTextContent("Resposta real da plataforma")

    act(() => vi.advanceTimersByTime(2000))
    expect(visual).toHaveTextContent("Resposta real da plataforma")
  })

  it("mostra imediatamente quando a animação está desativada", () => {
    render(<TypewriterText text="Sem animação" />)
    expect(screen.getByText("Sem animação")).toBeVisible()
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })
})
