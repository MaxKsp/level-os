import { describe, expect, it } from "vitest"
import type { TrainingProgram, TrainingSessionLog, Workout } from "./contracts"
import { nextWorkout } from "./nextWorkout"

const worksheets: Workout[] = [
  { id: "a", name: "Ficha A", focus: "geral", exercises: [] },
  { id: "b", name: "Ficha B", focus: "geral", exercises: [] },
  { id: "c", name: "Ficha C", focus: "geral", exercises: [] },
]
const program: TrainingProgram = {
  id: "p1", name: "Programa", version: 1, focus: "geral", daysPerWeek: 3, location: "academia",
  status: "active", source: "manual", createdAt: "2026-09-20",
  workouts: [worksheets[1], worksheets[2], worksheets[0]].map(({ id, name, focus }) => ({ id, name, focus })),
}
const logged = (id: string, date: string): TrainingSessionLog => ({
  id: id + date, workoutId: id, name: id, modality: "forca", date, exercises: [],
})
describe("nextWorkout", () => {
  it("respeita a sequencia do programa ativo e avanca depois da ultima ficha", () => {
    expect(nextWorkout(worksheets, [program], [])?.id).toBe("b")
    expect(nextWorkout(worksheets, [program], [logged("b", "2026-09-28")])?.id).toBe("c")
    expect(nextWorkout(worksheets, [program], [logged("c", "2026-09-29")])?.id).toBe("a")
    expect(nextWorkout(worksheets, [program], [logged("a", "2026-09-29")])?.id).toBe("b")
  })
  it("usa fichas individuais sem programa e ignora treinos externos ao programa", () => {
    expect(nextWorkout(worksheets, [], [logged("a", "2026-09-29")])?.id).toBe("b")
    expect(nextWorkout(worksheets, [program], [logged("x", "2026-09-29")])?.id).toBe("b")
    expect(nextWorkout([], [], [])).toBeNull()
  })
})
