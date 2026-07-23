import type { BodyMeasurement, TrainingSessionLog, TrainingSnapshot, Workout } from "./contracts"

declare global { interface Window { CSRF_TOKEN?: string } }

export function hasTrainingBackend(): boolean { return typeof window !== "undefined" && Boolean(window.CSRF_TOKEN) }

async function read<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const code = body && typeof body === "object" && "error" in body ? String(body.error) : `HTTP ${response.status}`
    throw new Error(code)
  }
  return body as T
}

export async function loadTraining(): Promise<TrainingSnapshot> {
  return read<TrainingSnapshot>(await fetch("/api/training.php", { credentials: "same-origin", headers: { Accept: "application/json" } }))
}

async function mutate<T>(operation: string, payload: Record<string, unknown>): Promise<T> {
  const body = await read<{ ok: true; result: T }>(await fetch("/api/training.php", {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json", "Content-Type": "application/json", "X-CSRF-Token": window.CSRF_TOKEN ?? "" },
    body: JSON.stringify({ operation, ...payload }),
  }))
  return body.result
}

export const saveWorkout = (workout: Workout) => mutate<Workout>("save_workout", { workout })
export const deleteWorkout = (id: string) => mutate<{ deleted: boolean }>("delete_workout", { id })
export const saveMeasurement = (measurement: Omit<BodyMeasurement, "id"> & { id?: string }) => mutate<BodyMeasurement>("log_measurement", { measurement })
export const deleteMeasurement = (id: string) => mutate<{ deleted: boolean }>("delete_measurement", { id })
export const saveSession = (session: Omit<TrainingSessionLog, "id"> & { id?: string }) => mutate<TrainingSessionLog>("log_session", { session })
export const deleteSession = (id: string) => mutate<{ deleted: boolean }>("delete_session", { id })
export const restoreProgram = (id: string) => mutate<{ program: unknown }>("restore_program", { id })
