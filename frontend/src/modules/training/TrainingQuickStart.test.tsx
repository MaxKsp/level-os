import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Workout } from "./contracts"
import { TrainingQuickStart } from "./TrainingQuickStart"

const workout: Workout = {
  id: "w1",
  name: "Treino A",
  focus: "Peito",
  exercises: [],
}

describe("TrainingQuickStart", () => {
  it("prioriza o treino sugerido e mantém os atalhos principais visíveis", () => {
    const onStart = vi.fn()
    const onScanner = vi.fn()
    const onLibrary = vi.fn()
    const onProgress = vi.fn()

    render(<TrainingQuickStart suggested={workout} onStart={onStart} onCreate={vi.fn()}
      onScanner={onScanner} onLibrary={onLibrary} onProgress={onProgress} />)

    expect(screen.getByText("O que você quer fazer agora?")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Iniciar Treino A/i }))
    expect(onStart).toHaveBeenCalledWith(workout)
    fireEvent.click(screen.getByRole("button", { name: /Reconhecer aparelho/i }))
    fireEvent.click(screen.getByRole("button", { name: /Explorar exercícios/i }))
    fireEvent.click(screen.getByRole("button", { name: /Ver evolução/i }))
    expect(onScanner).toHaveBeenCalledTimes(1)
    expect(onLibrary).toHaveBeenCalledTimes(1)
    expect(onProgress).toHaveBeenCalledTimes(1)
  })

  it("orienta a criar o primeiro treino quando não existe sugestão", () => {
    const onCreate = vi.fn()
    render(<TrainingQuickStart suggested={null} onStart={vi.fn()} onCreate={onCreate}
      onScanner={vi.fn()} onLibrary={vi.fn()} onProgress={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: /Criar primeiro treino/i }))
    expect(onCreate).toHaveBeenCalledTimes(1)
  })
})
