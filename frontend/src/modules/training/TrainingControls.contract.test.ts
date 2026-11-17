import { readFileSync, readdirSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const trainingDir = resolve(__dirname)
const sources = Object.fromEntries(
  readdirSync(trainingDir)
    .filter((name) => name.endsWith(".tsx"))
    .map((name) => [name, readFileSync(resolve(trainingDir, name), "utf8")]),
)

describe("Academia — controles do design system", () => {
  it("não usa select ou calendários/horários nativos do navegador", () => {
    const offenders = Object.entries(sources).flatMap(([file, source]) => {
      const problems: string[] = []
      if (/<select\b/i.test(source)) problems.push("select nativo")
      if (/type=["'](?:date|time|datetime-local|month|week)["']/i.test(source)) problems.push("data/hora nativa")
      if (/<datalist\b/i.test(source)) problems.push("datalist nativo")
      return problems.map((problem) => file + ": " + problem)
    })
    expect(offenders).toEqual([])
  })

  it("mantém os componentes Level OS nos formulários que precisam de escolha e data", () => {
    expect(sources["TrainingQuickLogModals.tsx"]).toContain("LevelSelect")
    expect(sources["TrainingQuickLogModals.tsx"]).toContain("LevelDateInput")
    expect(sources["TrainingLiveModal.tsx"]).toContain("LevelDateInput")
    expect(sources["WorkoutSessionModal.tsx"]).toContain("LevelDateInput")
    expect(sources["ExerciseLibraryPicker.tsx"]).toContain("LevelSelect")
  })
})
