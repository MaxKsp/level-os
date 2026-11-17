import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"
import type { Workout } from "./contracts"
import { WorkoutSessionModal } from "./WorkoutSessionModal"

vi.mock("../../components/ui/Modal", () => ({
  Modal: ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) => isOpen ? <div role="dialog">{children}</div> : null,
}))
const workout: Workout = {
  id: "workout-1", name: "Superior A", focus: "Peito e costas", exercises: [
    { id: "e1", name: "Supino", sets: 3, reps: 10, loadKg: 50, modality: "forca" },
    { id: "e2", name: "Remada", sets: 3, reps: 12, loadKg: 35, modality: "forca" },
  ],
}

describe("WorkoutSessionModal", () => {
  it("registra toda a ficha numa única sessão vinculada", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    render(<WorkoutSessionModal workout={workout} onClose={onClose} onSave={onSave} />)
    fireEvent.click(screen.getByRole("button", { name: /Finalizar 2 exercícios/i }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave.mock.calls[0][0]).toMatchObject({
      workoutId: "workout-1", name: "Superior A",
      exercises: [{ name: "Supino", sets: 3, reps: 10, loadKg: 50 }, { name: "Remada", sets: 3, reps: 12, loadKg: 35 }],
    })
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })
  it("permite retirar um exercício da sessão sem alterar a ficha", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<WorkoutSessionModal workout={workout} onClose={vi.fn()} onSave={onSave} />)
    fireEvent.click(screen.getByRole("checkbox", { name: "Realizado: Supino" }))
    fireEvent.click(screen.getByRole("button", { name: /Finalizar 1 exercício$/i }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave.mock.calls[0][0].exercises.map((e: { name: string }) => e.name)).toEqual(["Remada"])
    expect(workout.exercises).toHaveLength(2)
  })
  it("impede registro vazio", () => {
    const onSave = vi.fn()
    render(<WorkoutSessionModal workout={workout} onClose={vi.fn()} onSave={onSave} />)
    fireEvent.click(screen.getByRole("checkbox", { name: "Realizado: Supino" }))
    fireEvent.click(screen.getByRole("checkbox", { name: "Realizado: Remada" }))
    expect(screen.getByRole("button", { name: /Finalizar 0 exercícios/i })).toBeDisabled()
    expect(onSave).not.toHaveBeenCalled()
  })
})
