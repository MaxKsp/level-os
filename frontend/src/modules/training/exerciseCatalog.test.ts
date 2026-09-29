import { describe, expect, it } from "vitest"
import { EXERCISE_CATALOG, searchExercises } from "./exerciseCatalog"
describe("exercise library", () => {
  it("busca nomes mesmo quando o usuário omite acentos", () => {
    expect(searchExercises("elevacao lateral").map((item) => item.name)).toContain("Elevação lateral")
  })
  it("filtra por grupo e não inventa mídias", () => {
    expect(searchExercises("", "Peito").every((item) => item.group === "Peito")).toBe(true)
    expect(EXERCISE_CATALOG.every((item) => item.name && item.equipment && item.cue)).toBe(true)
  })
})
