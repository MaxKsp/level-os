import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import { WorkoutFormModal } from "./WorkoutFormModal"

vi.mock("../../components/ui/Modal", () => ({
  Modal: ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) =>
    isOpen ? <div role="dialog">{children}</div> : null,
}))
describe("WorkoutFormModal", () => {
  it("mantém o formulário e o mesmo ID de comando após erro remoto e retry", async () => {
    const onSave = vi.fn()
      .mockRejectedValueOnce(new Error("Falha temporária de rede"))
      .mockResolvedValueOnce(undefined)
    const onClose = vi.fn()
    render(<WorkoutFormModal open onSave={onSave} onClose={onClose} />)
    fireEvent.change(screen.getByPlaceholderText("Ex.: Superior A"), { target: { value: "Superior A" } })
    fireEvent.change(screen.getByPlaceholderText("Exercício 1"), { target: { value: "Supino" } })
    fireEvent.click(screen.getByRole("button", { name: "Criar treino" }))
    await waitFor(() => expect(screen.getByText("Falha temporária de rede")).toBeInTheDocument())
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "Criar treino" }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2))
    expect(onSave.mock.calls[0][0].id).toBe(onSave.mock.calls[1][0].id)
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })
  it("salva metas de carga e descanso junto aos exercícios da ficha", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<WorkoutFormModal open onSave={onSave} onClose={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText("Ex.: Superior A"), { target: { value: "Superior A" } })
    fireEvent.change(screen.getByPlaceholderText("Exercício 1"), { target: { value: "Supino" } })
    const load = screen.getByText("Carga prevista (kg)").querySelector("input")
    const rest = screen.getByText("Descanso (seg)").querySelector("input")
    expect(load).not.toBeNull()
    expect(rest).not.toBeNull()
    fireEvent.change(load!, { target: { value: "55" } })
    fireEvent.change(rest!, { target: { value: "90" } })
    fireEvent.click(screen.getByRole("button", { name: "Criar treino" }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave.mock.calls[0][0].exercises[0]).toMatchObject({
      name: "Supino", sets: "3", reps: "12", loadKg: 55, restSec: 90,
    })
  })
})
