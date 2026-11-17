import type { TrainingProgram, TrainingSessionLog, Workout } from "./contracts"

/**
 * Sugere a proxima ficha apenas pela ordem do programa e pelo ultimo registro.
 * Nao presume recuperacao, capacidade fisica nem agenda de dias da semana.
 */
export function nextWorkout(
  workouts: Workout[], programs: TrainingProgram[], sessions: TrainingSessionLog[],
): Workout | null {
  const active = programs.find((program) => program.status === "active")
  const ordered = active
    ? active.workouts.map(({ id }) => workouts.find((workout) => workout.id === id)).filter((w): w is Workout => Boolean(w))
    : workouts
  if (!ordered.length) return workouts[0] ?? null
  const ids = new Set(ordered.map((workout) => workout.id))
  const latest = sessions.filter((session) => session.workoutId && ids.has(session.workoutId))
    .slice().sort((a, b) => b.date.localeCompare(a.date))[0]
  const index = ordered.findIndex((workout) => workout.id === latest?.workoutId)
  return ordered[(index + 1) % ordered.length]
}
