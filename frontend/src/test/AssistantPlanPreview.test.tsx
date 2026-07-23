import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { AssistantResultCard } from "../modules/assistant/AssistantResultCard"

describe("prévia editável dos planos do agente", () => {
  it("edita uma refeição sem aplicar o plano", () => {
    const onApprovalChange = vi.fn()
    render(<AssistantResultCard
      response={{
        ok: true,
        status: "confirmation",
        action: "create_diet_plan",
        message: "Revise o cardápio.",
        module: "alimentacao",
        undoAvailable: false,
        confirmationRequired: true,
        actionToken: "a".repeat(32),
        data: {
          hasActivePlan: true,
          plan: {
            goal: "emagrecimento",
            periodDays: 2,
            budgetBRL: 100,
            estimatedCostBRL: 20,
            days: [{ day: 1, meals: [{ name: "Almoço", description: "Arroz e feijão", estimatedCostBRL: 10 }] }],
          },
        },
      }}
      onView={vi.fn()}
      onApprovalChange={onApprovalChange}
    />)

    fireEvent.click(screen.getByRole("button", { name: "Editar refeições" }))
    fireEvent.change(screen.getByLabelText("Refeição"), { target: { value: "Almoço leve" } })

    expect(onApprovalChange).toHaveBeenCalledWith(expect.objectContaining({
      draft: expect.objectContaining({
        estimatedCostBRL: 20,
        days: [expect.objectContaining({ meals: [expect.objectContaining({ name: "Almoço leve" })] })],
      }),
    }))
  })

  it("preserva o rascunho ao escolher como aplicar um programa", () => {
    const onApprovalChange = vi.fn()
    const draft = {
      focus: "força",
      daysPerWeek: 1,
      location: "academia",
      workouts: [{ name: "Ficha A", focus: "força", exercises: [{ name: "Agachamento", sets: 3, reps: 5, restSec: 90 }] }],
    }
    render(<AssistantResultCard
      response={{
        ok: true,
        status: "confirmation",
        action: "create_workout_program",
        message: "Revise o programa.",
        module: "treinos",
        undoAvailable: false,
        confirmationRequired: true,
        actionToken: "b".repeat(32),
        data: { ...draft, currentWorkouts: [{ id: "old", name: "Ficha anterior", focus: "geral" }] },
      }}
      approval={{ draft, mode: "replace_all" }}
      onView={vi.fn()}
      onApprovalChange={onApprovalChange}
    />)

    fireEvent.click(screen.getByLabelText("Adicionar fichas"))

    expect(onApprovalChange).toHaveBeenCalledWith(expect.objectContaining({ mode: "append", draft }))
  })
})
