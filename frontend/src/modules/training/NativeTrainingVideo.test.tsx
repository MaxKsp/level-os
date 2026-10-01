import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { LibraryExercise } from "./exerciseCatalog"
import { NativeTrainingVideo } from "./NativeTrainingVideo"

const base: LibraryExercise = {
  id: "wger-10", name: "Leg press", group: "Pernas", modality: "forca",
  equipment: "Máquina", cue: "Controle a amplitude.", source: "wger",
  sourceUrl: "https://wger.de/exercise/10/view",
  imageUrl: "https://wger.de/media/exercise.png",
  motionFrames: ["https://wger.de/media/exercise.png"],
  steps: ["Ajuste o banco antes de começar.", "Desça com controle e mantenha os pés apoiados."],
}

describe("NativeTrainingVideo", () => {
  it("reproduz vídeo direto licenciado dentro do Level OS", () => {
    const exercise = { ...base, video: {
      url: "https://wger.de/media/exercise-video/10/demo.mp4",
      license: "CC-BY-SA 4", author: "Wger",
    } }
    render(<NativeTrainingVideo exercise={exercise} />)
    const player = screen.getByLabelText("Vídeo de execução de Leg press")
    expect(player.tagName).toBe("VIDEO")
    expect(player).toHaveAttribute("src", exercise.video.url)
    expect(screen.getByText("VÍDEO LEVEL OS")).toBeInTheDocument()
  })

  it("oferece tutorial guiado quando não existe vídeo direto", () => {
    render(<NativeTrainingVideo exercise={{ ...base, video: null }} />)
    expect(screen.getByText("TUTORIAL GUIADO")).toBeInTheDocument()
    expect(screen.getAllByText("Ajuste o banco antes de começar.").length).toBeGreaterThan(0)
    expect(screen.getByRole("button", { name: "Reproduzir" })).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText("Próxima etapa"))
    expect(screen.getAllByText("Desça com controle e mantenha os pés apoiados.").length).toBeGreaterThan(0)
  })
})
