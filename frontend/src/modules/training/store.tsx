import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import type { BodyMeasurement, TrainingSessionLog, TrainingSnapshot, Workout } from "./contracts"
import { deleteMeasurement, deleteSession, deleteWorkout, hasTrainingBackend, loadTraining, restoreProgram, saveMeasurement, saveSession, saveWorkout } from "./api"
import { useProgress } from "../progress/store"
import { userStorageKey } from "../../lib/userStorage"

const KEY = "level-os:training:v2"
export function wid(prefix = "w"): string { return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` }

const SEED: TrainingSnapshot = { workouts: [], measurements: [], sessions: [], programs: [], programHistory: [] }
type SyncStatus = "local" | "loading" | "ready" | "saving" | "error"
interface TrainingContextValue extends TrainingSnapshot {
  status: SyncStatus
  error: string | null
  refresh: () => Promise<void>
  addWorkout: (value: Workout) => Promise<void>
  updateWorkout: (value: Workout) => Promise<void>
  removeWorkout: (id: string) => Promise<void>
  addMeasurement: (value: Omit<BodyMeasurement, "id">) => Promise<void>
  removeMeasurement: (id: string) => Promise<void>
  addSession: (value: Omit<TrainingSessionLog, "id">) => Promise<void>
  removeSession: (id: string) => Promise<void>
  restoreProgram: (id: string) => Promise<void>
}

const Ctx = createContext<TrainingContextValue | undefined>(undefined)
function localSnapshot(): TrainingSnapshot {
  try { const parsed = JSON.parse(localStorage.getItem(userStorageKey(KEY)) ?? "null"); if (parsed?.workouts && parsed?.measurements && parsed?.sessions) return { programs: [], programHistory: [], ...parsed } }
  catch { /* cache inválido */ }
  return SEED
}

export function TrainingProvider({ children }: { children: ReactNode }) {
  const remote = hasTrainingBackend()
  const { refresh: refreshProgress } = useProgress()
  const [data, setData] = useState<TrainingSnapshot>(remote ? SEED : localSnapshot)
  const [status, setStatus] = useState<SyncStatus>(remote ? "loading" : "local")
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { if (!remote) localStorage.setItem(userStorageKey(KEY), JSON.stringify(data)) }, [data, remote])

  const refresh = useCallback(async () => {
    if (!remote) return
    try { setData(await loadTraining()); setStatus("ready"); setError(null) }
    catch (cause) { setStatus("error"); setError(cause instanceof Error ? cause.message : "Falha ao carregar treinos.") }
  }, [remote])
  useEffect(() => { void refresh() }, [refresh])

  const run = async (operation: () => Promise<void>) => {
    setStatus(remote ? "saving" : "local"); setError(null)
    try { await operation(); if (remote) await refresh() }
    catch (cause) { setStatus("error"); setError(cause instanceof Error ? cause.message : "Falha ao salvar treino."); throw cause }
  }
  const upsert = async (workout: Workout) => run(async () => {
    if (remote) await saveWorkout(workout)
    else setData((current) => ({ ...current, workouts: [...current.workouts.filter((item) => item.id !== workout.id), workout] }))
  })

  const value: TrainingContextValue = {
    ...data, status, error, refresh,
    addWorkout: upsert, updateWorkout: upsert,
    removeWorkout: (id) => run(async () => { if (remote) await deleteWorkout(id); else setData((c) => ({ ...c, workouts: c.workouts.filter((x) => x.id !== id) })) }),
    addMeasurement: (item) => run(async () => { if (remote) await saveMeasurement(item); else setData((c) => ({ ...c, measurements: [{ ...item, id: wid("bm") }, ...c.measurements] })) }),
    removeMeasurement: (id) => run(async () => { if (remote) await deleteMeasurement(id); else setData((c) => ({ ...c, measurements: c.measurements.filter((x) => x.id !== id) })) }),
    addSession: (item) => run(async () => { if (remote) await saveSession(item); else setData((c) => ({ ...c, sessions: [{ ...item, id: wid("ts") }, ...c.sessions] })); await refreshProgress() }),
    removeSession: (id) => run(async () => { if (remote) await deleteSession(id); else setData((c) => ({ ...c, sessions: c.sessions.filter((x) => x.id !== id) })); await refreshProgress() }),
    restoreProgram: (id) => run(async () => { if (remote) await restoreProgram(id) }),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTraining(): TrainingContextValue {
  const value = useContext(Ctx)
  if (!value) throw new Error("useTraining precisa estar dentro de <TrainingProvider>")
  return value
}
