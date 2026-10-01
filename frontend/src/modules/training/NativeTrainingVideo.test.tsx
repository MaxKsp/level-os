import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { LibraryExercise } from "./exerciseCatalog"
import { NativeTrainingVideo } from "./NativeTrainingVideo"

const base: LibraryExercise = {
  id: "wger-10", name: "Leg press", group: "Pernas", modality: "forca",
  equipment: "Máquina", cue: "Controle a amplitude.", source: "wger",
  sourceUrl: "https://wger.de/exercise/10/view",
}

describe("NativeTrainingVideo", () => {
  it("reproduz mídia direta dentro do Level OS", () => {
    const exercise = { ...base, video: {
      url: "https://wger.de/media/exercise-video/10/demo.mp4",
      license: "CC-BY-SA 4", author: "Wger",
    } }
    render(<NativeTrainingVideo exercise={exercise} />)
    const player = screen.getByLabelText("Vídeo de execução de Leg press")
    expect(player.tagName).toBe("VIDEO")
    expect(player).toHaveAttribute("src", exercise.video.url)
    expect(screen.getByText("PLAYER LEVEL OS")).toBeInTheDocument()
  })
  it("não inventa vídeo quando a fonte não possui mídia licenciada", () => {
    render(<NativeTrainingVideo exercise={{ ...base, video: null }} />)
    expect(screen.getByText("Vídeo nativo indisponível nesta referência")).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })
})
