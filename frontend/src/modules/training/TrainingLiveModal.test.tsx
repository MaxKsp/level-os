import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"
import { TrainingLiveModal } from "./TrainingLiveModal"
import type { Workout } from "./contracts"
vi.mock("../../components/ui/Modal", () => ({
  Modal: ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) => isOpen ? <div role="dialog">{children}</div> : null,
}))
const workout: Workout = { id: "wo1", name: "Superior A", focus: "Peito",
  exercises: [{ id: "ex1", name: "Supino", modality: "forca", sets: 2, reps: 10, loadKg: 50, restSec: 60 }],
}
describe("TrainingLiveModal", () => {
  it("registra por série, com RPE/RIR, acionando o descanso real", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<TrainingLiveModal workout={workout} history={[]} onSave={onSave} onClose={vi.fn()} />)
    fireEvent.change(screen.getByRole("textbox", { name: "RPE série 1 de Supino" }), { target: { value: "8,5" } })
    fireEvent.change(screen.getByRole("textbox", { name: "RIR série 1 de Supino" }), { target: { value: "1" } })
    fireEvent.click(screen.getByRole("button", { name: "Concluir série 1 de Supino" }))
    expect(screen.getByLabelText("Tempo restante de descanso")).not.toHaveTextContent("00:00")
    fireEvent.click(screen.getByRole("button", { name: /Finalizar treino/ }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave.mock.calls[0][0]).toMatchObject({ workoutId: "wo1", exercises: [
      { name: "Supino", sets: 1, reps: 10, loadKg: 50, rpe: 8.5, rir: 1, restSec: 60 },
    ] })
  })
  it("bloqueia RPE inválido antes de enviar à API", async () => {
    const onSave = vi.fn()
    render(<TrainingLiveModal workout={workout} history={[]} onSave={onSave} onClose={vi.fn()} />)
    fireEvent.change(screen.getByRole("textbox", { name: "RPE série 1 de Supino" }), { target: { value: "7,3" } })
    fireEvent.click(screen.getByRole("button", { name: "Concluir série 1 de Supino" }))
    fireEvent.click(screen.getByRole("button", { name: /Finalizar treino/ }))
    expect(await screen.findByRole("alert")).toHaveTextContent("intervalos de 0,5")
    expect(onSave).not.toHaveBeenCalled()
  })
  it("mantém a mesma identidade da sessão após erro e repetição", async () => {
    const onSave = vi.fn().mockRejectedValueOnce(new Error("Falha temporária")).mockResolvedValueOnce(undefined)
    render(<TrainingLiveModal workout={workout} history={[]} onSave={onSave} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: "Concluir série 1 de Supino" }))
    fireEvent.click(screen.getByRole("button", { name: /Finalizar treino/ }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Falha temporária")
    fireEvent.click(screen.getByRole("button", { name: /Finalizar treino/ }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2))
    expect(onSave.mock.calls[0][0].id).toBe(onSave.mock.calls[1][0].id)
  })
  it("pede confirmação visual antes de descartar séries concluídas", () => {
    const onClose = vi.fn()
    render(<TrainingLiveModal workout={workout} history={[]} onSave={vi.fn()} onClose={onClose} />)
    fireEvent.click(screen.getByRole("button", { name: "Concluir série 1 de Supino" }))
    fireEvent.click(screen.getByRole("button", { name: "Descartar" }))
    expect(screen.getByRole("alertdialog", { name: "Confirmação de descarte" })).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "Continuar treino" }))
    expect(screen.queryByRole("alertdialog", { name: "Confirmação de descarte" })).not.toBeInTheDocument()
  })
  it("mantém séries e cargas funcionais sem migração, mas não envia esforço não suportado", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<TrainingLiveModal workout={workout} history={[]} effortMetricsAvailable={false}
      onSave={onSave} onClose={vi.fn()} />)
    expect(screen.getByRole("textbox", { name: "RPE série 1 de Supino" })).toBeDisabled()
    expect(screen.getByRole("textbox", { name: "RIR série 1 de Supino" })).toBeDisabled()
    expect(screen.getByText(/RPE\/RIR temporariamente indisponíveis/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Concluir série 1 de Supino" }))
    fireEvent.click(screen.getByRole("button", { name: /Finalizar treino/ }))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave.mock.calls[0][0].exercises[0]).toMatchObject({
      reps: 10, loadKg: 50, rpe: null, rir: null,
    })
  })
})
