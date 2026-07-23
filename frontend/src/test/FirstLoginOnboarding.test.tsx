import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { FirstLoginOnboarding } from "../modules/onboarding/FirstLoginOnboarding"

const completeOnboarding = vi.fn()

vi.mock("../modules/preferences/store", () => ({
  usePreferences: () => ({
    onboarding_completed: false,
    status: "ready",
    completeOnboarding,
  }),
}))

vi.mock("@/components/ui/pixel-card", () => ({
  PixelCard: ({ children }: { children: ReactNode }) => <div data-testid="pixel-card">{children}</div>,
}))

describe("FirstLoginOnboarding", () => {
  beforeEach(() => completeOnboarding.mockClear())

  it("abre com o Pixel Card e conclui o roteiro completo", () => {
    render(<MemoryRouter><FirstLoginOnboarding /></MemoryRouter>)

    expect(screen.getByTestId("pixel-card")).toBeInTheDocument()
    expect(screen.getByText("Seu próximo nível começa agora.")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /Começar agora/ }))
    expect(screen.getByText("Comece pelo que pede atenção hoje")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /Continuar/ }))
    fireEvent.click(screen.getByRole("button", { name: /Continuar/ }))
    fireEvent.click(screen.getByRole("button", { name: /Continuar/ }))
    expect(screen.getByText("Evolução que você consegue enxergar")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /Entrar no Level 1/ }))
    expect(completeOnboarding).toHaveBeenCalledTimes(1)
  })
})
