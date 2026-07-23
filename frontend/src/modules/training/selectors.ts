import type { WeightRecord, WorkoutSession } from "./contracts"

export interface TrainingSummary {
  title: string
  focus: string
  durationMin: number
  total: number
  completed: number
  progress: number
  currentWeight: number
  weightDelta: number
}

export function trainingSummary(
  workout: WorkoutSession,
  weights: WeightRecord[],
): TrainingSummary {
  const completed = workout.exercises.filter((e) => e.completed).length
  const total = workout.exercises.length
  const current = weights.at(-1)?.weight ?? 0
  const first = weights.at(0)?.weight ?? current
  return {
    title: workout.title,
    focus: workout.focus,
    durationMin: workout.durationMin,
    total,
    completed,
    progress: total > 0 ? Math.round((completed / total) * 100) : 0,
    currentWeight: current,
    weightDelta: Number((current - first).toFixed(1)),
  }
}
