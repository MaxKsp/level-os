import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { AchievementGrid } from "../modules/progress/components/AchievementGrid"
import { AchievementsModal } from "../modules/progress/components/AchievementsModal"
import { DEMO_PROGRESS } from "../modules/progress/store"

describe("AchievementGrid", () => {
  it("filtra as trilhas e mostra progresso de conquistas bloqueadas", () => {
    render(<AchievementGrid achievements={DEMO_PROGRESS.achievements} showFilters />)

    fireEvent.click(screen.getByRole("button", { name: "Finanças" }))
    expect(screen.getByText("Mapa financeiro")).toBeInTheDocument()
    expect(screen.queryByText("Série completa")).not.toBeInTheDocument()
    expect(screen.getByRole("progressbar", { name: "Progresso de Visão de longo prazo" })).toHaveAttribute("aria-valuenow", "27")
  })

  it("mantém a coleção completa em um modal acessível", () => {
    render(<AchievementsModal isOpen onClose={() => undefined} achievements={DEMO_PROGRESS.achievements} />)

    expect(DEMO_PROGRESS.achievements).toHaveLength(30)
    expect(screen.getByRole("dialog", { name: "Conquistas" })).toBeInTheDocument()
    expect(screen.getByText("Tríade em equilíbrio")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Fechar janela" })).toBeInTheDocument()
  })
})
