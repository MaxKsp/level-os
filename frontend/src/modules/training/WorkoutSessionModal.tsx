import { useEffect, useState } from "react"
import { Check, Dumbbell, Timer } from "lucide-react"
import { Modal } from "../../components/ui/Modal"
import { Button } from "../../components/ui/button"
import type { SessionExercise, TrainingModality, TrainingSessionLog, Workout } from "./contracts"

type Entry = { key: string; name: string; modality: TrainingModality; included: boolean; sets: string; reps: string; loadKg: string; restSec: string; durationMin: string; distanceKm: string; progressionLevel: string }
const field = "min-h-10 w-full min-w-0 rounded-lg border border-outline-variant bg-surface px-2.5 py-2 text-sm text-on-surface outline-none focus:border-primary disabled:opacity-40"
const today = () => new Date().toLocaleDateString("sv-SE")
function numeric(value: string, min: number, max: number, required: boolean, label: string): number | null {
  if (!value.trim()) { if (required) throw new Error(`Preencha ${label}.`); return null }
  const parsed = Number(value.trim().replace(",", "."))
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) throw new Error(`Valor inválido para ${label}.`)
  return parsed
}
function formEntry(workout: Workout): Entry[] {
  return workout.exercises.map((e) => ({
    key: e.id, name: e.name, modality: e.modality ?? "forca", included: true,
    sets: String(e.sets ?? "3"), reps: String(e.reps ?? "10"),
    loadKg: e.loadKg == null ? "" : String(e.loadKg),
    restSec: e.restSec == null ? "" : String(e.restSec),
    durationMin: e.durationSec ? String(Math.round(e.durationSec / 60)) : "20",
    distanceKm: "", progressionLevel: e.progressionLevel ?? "",
  }))
}
interface Props {
  workout: Workout | null
  onClose: () => void
  onSave: (value: Omit<TrainingSessionLog, "id">) => Promise<void>
}
export function WorkoutSessionModal({ workout, onClose, onSave }: Props) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [date, setDate] = useState(today)
  const [duration, setDuration] = useState("45")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => {
    if (!workout) return
    setEntries(formEntry(workout))
    setDate(today())
    setDuration("45")
    setError("")
  }, [workout])
  const update = (key: string, patch: Partial<Entry>) =>
    setEntries((current) => current.map((entry) => entry.key === key ? { ...entry, ...patch } : entry))
  const selected = entries.filter((entry) => entry.included).length
  const submit = async () => {
    if (!workout || saving) return
    setError("")
    try {
      if (!selected) throw new Error("Marque ao menos um exercício realizado.")
      if (!date || date > today()) throw new Error("Informe uma data válida.")
      const durationMin = numeric(duration, 1, 2880, true, "duração total")
      const exercises: SessionExercise[] = entries.filter((entry) => entry.included).map((entry) => {
        const count = (value: string, min: number, max: number, required: boolean, label: string) => {
          const parsed = numeric(value, min, max, required, `${entry.name}: ${label}`)
          if (parsed !== null && !Number.isInteger(parsed)) throw new Error(`Informe um número inteiro em ${entry.name}: ${label}.`)
          return parsed
        }
        const needsSets = entry.modality === "forca"
        const isTimed = entry.modality === "cardio" || entry.modality === "mobilidade"
        return {
          name: entry.name, modality: entry.modality,
          sets: needsSets || entry.modality === "calistenia" ? count(entry.sets, 1, 100, needsSets, "séries") : null,
          reps: needsSets || entry.modality === "calistenia" ? count(entry.reps, 1, 10000, needsSets, "repetições") : null,
          loadKg: entry.modality === "forca" ? numeric(entry.loadKg, 0, 2000, false, `${entry.name}: carga`) : null,
          restSec: count(entry.restSec, 0, 7200, false, "descanso"),
          durationSec: isTimed ? count(entry.durationMin, 1, 2880, true, "duração")! * 60 : null,
          distanceKm: entry.modality === "cardio" ? numeric(entry.distanceKm, 0, 1000, true, `${entry.name}: distância`) : null,
          progressionLevel: entry.modality === "calistenia" ? entry.progressionLevel.trim() || null : null,
        }
      })
      setSaving(true)
      await onSave({
        workoutId: workout.id, name: workout.name,
        modality: exercises[0].modality, date, durationSec: durationMin! * 60,
        source: "manual", exercises,
      })
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar a sessão.")
    } finally { setSaving(false) }
  }
  return (
    <Modal isOpen={Boolean(workout)} onClose={() => { if (!saving) onClose() }} title={workout ? `Treinar · ${workout.name}` : "Iniciar treino"} description="Registre os exercícios realizados; os itens não marcados ficam fora do histórico." icon="fitness_center" maxWidth="max-w-3xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 p-3">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface"><Dumbbell className="size-4 text-primary" /> {selected} de {entries.length} exercícios</span>
          <span className="text-xs text-muted">Ficha vinculada ao histórico</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-medium text-on-surface-variant">Data<input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} className={field + " mt-1"} /></label>
          <label className="text-xs font-medium text-on-surface-variant"><Timer className="mr-1 inline size-3.5" />Duração total (min)<input inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} className={field + " mt-1"} /></label>
        </div>
        <div className="space-y-2">
          {entries.map((entry, index) => (
            <div key={entry.key} className={`rounded-xl border p-3 transition-colors ${entry.included ? "border-outline-variant bg-surface/75" : "border-outline-variant/40 opacity-55"}`}>
              <label className="flex min-h-10 cursor-pointer items-center gap-3">
                <input type="checkbox" checked={entry.included} onChange={(e) => update(entry.key, { included: e.target.checked })} className="size-4 accent-primary" aria-label={`Realizado: ${entry.name}`} />
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">{String(index + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1 text-sm font-semibold text-on-surface">{entry.name}</span>
                {entry.included ? <Check className="size-4 text-primary" aria-hidden="true" /> : null}
              </label>
              {entry.included ? (
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-outline-variant pt-3 sm:grid-cols-4">
                  {entry.modality === "forca" || entry.modality === "calistenia" ? (<>
                    <label className="text-[11px] text-muted">Séries<input className={field + " mt-1"} inputMode="numeric" value={entry.sets} onChange={(e) => update(entry.key, { sets: e.target.value })} /></label>
                    <label className="text-[11px] text-muted">Repetições<input className={field + " mt-1"} inputMode="numeric" value={entry.reps} onChange={(e) => update(entry.key, { reps: e.target.value })} /></label>
                    {entry.modality === "forca" ? <label className="text-[11px] text-muted">Carga (kg)<input className={field + " mt-1"} inputMode="decimal" placeholder="Opcional" value={entry.loadKg} onChange={(e) => update(entry.key, { loadKg: e.target.value })} /></label> :
                      <label className="text-[11px] text-muted">Progressão<input className={field + " mt-1"} value={entry.progressionLevel} onChange={(e) => update(entry.key, { progressionLevel: e.target.value })} /></label>}
                  </>) : (<>
                    <label className="text-[11px] text-muted">Duração (min)<input className={field + " mt-1"} inputMode="numeric" value={entry.durationMin} onChange={(e) => update(entry.key, { durationMin: e.target.value })} /></label>
                    {entry.modality === "cardio" ? <label className="text-[11px] text-muted">Distância (km)<input className={field + " mt-1"} inputMode="decimal" value={entry.distanceKm} onChange={(e) => update(entry.key, { distanceKm: e.target.value })} placeholder="Ex.: 3,5" /></label> : null}
                  </>)}
                  <label className="text-[11px] text-muted">Descanso (seg)<input className={field + " mt-1"} inputMode="numeric" value={entry.restSec} onChange={(e) => update(entry.key, { restSec: e.target.value })} placeholder="Opcional" /></label>
                </div>
              ) : null}
            </div>
          ))}
        </div>
        {error ? <p role="alert" className="rounded-lg border border-error/25 bg-error/10 p-3 text-xs text-error">{error}</p> : null}
        <div className="flex flex-wrap justify-end gap-2 border-t border-outline-variant pt-3">
          <Button variant="ghost" size="md" disabled={saving} onClick={onClose}>Cancelar</Button>
          <Button variant="primary" size="md" disabled={!selected || saving} onClick={() => void submit()}>
            <Check className="size-4" /> {saving ? "Salvando..." : `Finalizar ${selected} exercício${selected === 1 ? "" : "s"}`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
