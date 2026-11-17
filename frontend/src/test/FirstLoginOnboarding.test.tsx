import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { FirstLoginOnboarding } from "../modules/onboarding/FirstLoginOnboarding"

const completeOnboarding = vi.fn()
const setIsExpenseModalOpen = vi.fn()
const setIsTaskModalOpen = vi.fn()
const setIsWorkoutModalOpen = vi.fn()

vi.mock("../modules/preferences/store", () => ({ usePreferences: () => ({ onboarding_completed: false, status: "ready", completeOnboarding }) }))
vi.mock("../context/AppContext", () => ({ useApp: () => ({ tasks: [], setIsExpenseModalOpen, setIsTaskModalOpen, setIsWorkoutModalOpen }) }))
vi.mock("../modules/finance/store", () => ({ useFinance: () => ({ accounts: [], expenses: [], income: [], variableIncome: [] }) }))
vi.mock("../modules/training/store", () => ({ useTraining: () => ({ workouts: [] }) }))
vi.mock("../modules/nutrition/store", () => ({ useNutrition: () => ({ plan: null }) }))
vi.mock("@/components/ui/pixel-card", () => ({ PixelCard: ({ children }: { children: ReactNode }) => <div data-testid="pixel-card">{children}</div> }))

describe("FirstLoginOnboarding", () => {
  beforeEach(() => vi.clearAllMocks())

  it("troca a introdução pelo checklist de ativação", () => {
    render(<MemoryRouter><FirstLoginOnboarding /></MemoryRouter>)
    expect(screen.getByTestId("pixel-card")).toBeInTheDocument()
    expect(screen.getByText("Seu sistema começa com quatro ações reais.")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /Configurar meu Level OS/ }))
    expect(screen.getByText("Cadastre sua primeira conta")).toBeInTheDocument()
    expect(screen.getByText("Crie uma tarefa recorrente")).toBeInTheDocument()
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0")
  })

  it("permite concluir e continuar depois", () => {
    render(<MemoryRouter><FirstLoginOnboarding /></MemoryRouter>)
    fireEvent.click(screen.getByRole("button", { name: /Configurar meu Level OS/ }))
    fireEvent.click(screen.getByRole("button", { name: /Continuar depois/ }))
    expect(completeOnboarding).toHaveBeenCalledTimes(1)
  })
})
