import { describe, expect, it } from "vitest"
import { normalizeLibraryExercise } from "./trainingKnowledge"

describe("training knowledge normalization", () => {
  it("preserva conteúdo, mídia e atribuição recebidos da API", () => {
    const item = normalizeLibraryExercise({
      id: "wger-75", name: "Supino com halteres", language: "pt", group: "Peito", modality: "forca",
      equipment: ["Halteres", "Banco"], instructions: "Controle a descida. Mantenha os pés apoiados.",
      imageUrl: "https://wger.de/media/exercise.png", imageLicense: "CC-BY-SA 4", imageAuthor: "Imagem",
      motionFrames: ["https://wger.de/media/exercise.png"],
      steps: ["Controle a descida.", "Mantenha os pés apoiados."],
      video: { url: "https://wger.de/media/video.mp4", author: "Goulart", license: "CC-BY-SA 4" },
      source: "wger", sourceUrl: "https://wger.de/exercise/75/view", license: "CC-BY-SA 3", author: "Autor",
    })
    expect(item.equipment).toBe("Halteres / Banco")
    expect(item.cue).toBe("Controle a descida.")
    expect(item.imageLicense).toBe("CC-BY-SA 4")
    expect(item.video).toMatchObject({ author: "Goulart", license: "CC-BY-SA 4" })
    expect(item.steps).toEqual(["Controle a descida.", "Mantenha os pés apoiados."])
    expect(item.motionFrames).toEqual(["https://wger.de/media/exercise.png"])
    expect(item.source).toBe("wger")
  })

  it("preserva vídeo YouTube e pontos de técnica do catálogo rápido", () => {
    const item = normalizeLibraryExercise({
      id: "workoutdb-bench-press", name: "Bench Press", language: "fallback", group: "Peito", modality: "forca",
      equipment: ["Barra"], instructions: "Lower the bar under control. Press it back up.",
      steps: ["Lower the bar under control.", "Press it back up."],
      formCues: ["Keep your upper back stable."],
      imageUrl: "https://i.ytimg.com/vi/gBZkSn-zsD0/mqdefault.jpg",
      video: { url: "https://www.youtube.com/watch?v=gBZkSn-zsD0", provider: "youtube", youtubeId: "gBZkSn-zsD0" },
      source: "workout-db", sourceUrl: "https://github.com/rthepen/workout-database",
    })
    expect(item.video).toMatchObject({ provider: "youtube", youtubeId: "gBZkSn-zsD0" })
    expect(item.formCues).toEqual(["Keep your upper back stable."])
    expect(item.source).toBe("workout-db")
  })

  it("remove numeração solta do resumo exibido nos cards", () => {
    const item = normalizeLibraryExercise({
      id: "wger-2", name: "Abdominal", language: "pt", group: "Core", modality: "calistenia",
      equipment: ["Colchonete"], instructions: "1. Deite-se de costas com os joelhos flexionados. Eleve o tronco com controle.",
      source: "wger", sourceUrl: "https://wger.de/exercise/2/view",
    })
    expect(item.cue).toBe("Deite-se de costas com os joelhos flexionados.")
  })

  it("preserva a fonte de imagens complementares", () => {
    const item = normalizeLibraryExercise({
      id: "repdb-kettlebell-halo", name: "Kettlebell Halo", language: "fallback",
      group: "Ombros", modality: "forca", equipment: ["Kettlebell"], instructions: "Move with control.",
      imageUrl: "https://raw.githubusercontent.com/RepDB/exercise-dataset/main/images/flat/kettlebell-halo-start.webp",
      imageLicense: "RepDB Free Tier License v1.0", imageAuthor: "RepDB",
      source: "repdb", sourceUrl: "https://exercise-dataset.com/exercise/kettlebell-halo/",
    })
    expect(item.source).toBe("repdb")
    expect(item.imageUrl).toContain("raw.githubusercontent.com/RepDB/exercise-dataset")
    expect(item.imageLicense).toBe("RepDB Free Tier License v1.0")
  })

  it("expõe fallback de idioma e nunca inventa mídia", () => {
    const item = normalizeLibraryExercise({
      id: "wger-1", name: "English exercise", language: "fallback", group: "Costas", modality: "forca",
      equipment: [], instructions: "", source: "wger", sourceUrl: "https://wger.de/exercise/1/view",
    })
    expect(item.language).toBe("fallback")
    expect(item.equipment).toBe("Equipamento não informado")
    expect(item.imageUrl).toBeNull()
    expect(item.video).toBeNull()
  })
})
