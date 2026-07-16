/** Mock ISOLADO do Treino para o preview (view models de front-end). */
import type { WeightRecord, WorkoutSession } from "./contracts"

export const workoutMock: WorkoutSession = {
  title: "Superior A",
  focus: "Peito, ombros e tríceps",
  durationMin: 45,
  exercises: [
    { id: "ex-1", name: "Supino reto (barra)", sets: "4 x 10", completed: true },
    {
      id: "ex-2",
      name: "Supino inclinado (halteres)",
      sets: "3 x 12",
      completed: true,
    },
    {
      id: "ex-3",
      name: "Crucifixo reto (halteres)",
      sets: "3 x 12",
      completed: true,
    },
    {
      id: "ex-4",
      name: "Desenvolvimento de ombros",
      sets: "4 x 10",
      completed: false,
    },
    { id: "ex-5", name: "Tríceps pulley", sets: "3 x 12", completed: false },
    { id: "ex-6", name: "Elevação lateral", sets: "4 x 15", completed: false },
  ],
}

export const weightHistoryMock: WeightRecord[] = [
  { date: "12/07", weight: 81.2 },
  { date: "13/07", weight: 80.9 },
  { date: "14/07", weight: 80.5 },
  { date: "15/07", weight: 80.2 },
  { date: "16/07", weight: 80.0 },
]
