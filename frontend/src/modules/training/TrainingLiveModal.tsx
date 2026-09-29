import { useEffect, useMemo, useState } from "react"
import { Activity, Check, CheckCircle2, Circle, Dumbbell, Pause, Play, Plus, RotateCcw, Timer, Trash2 } from "lucide-react"
import { Modal } from "../../components/ui/Modal"
import { Button } from "../../components/ui/button"
import { LevelDateInput } from "../../components/ui/LevelDateInput"
import type { SessionExercise, TrainingSessionLog, Workout, WorkoutExercise } from "./contracts"
import { wid } from "./store"
import { bestExerciseLoad } from "./trainingRecords"

type SetDraft = { id: string; done: boolean; reps: string; load: string; rpe: string; rir: string }
type ExerciseDraft = {
  template: WorkoutExercise; sets: SetDraft[]; completed: boolean;
  rest: string; duration: string; distance: string
}
const field = "min-h-10 w-full min-w-0 rounded-lg border border-outline-variant bg-surface-container px-2 py-2 text-sm text-on-surface outline-none focus-visible:border-primary disabled:opacity-50"
const localDate = () => new Date().toLocaleDateString("sv-SE")
const value = (raw: string, min: number, max: number, label: string, required = false): number | null => {
  if (!raw.trim()) { if (required) throw new Error("Preencha " + label + "."); return null }
  const parsed = Number(raw.trim().replace(",", "."))
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) throw new Error("Revise " + label + ".")
  return parsed
}
const initialSet = (exercise: WorkoutExercise): SetDraft => ({
  id: wid("set"), done: false, reps: String(exercise.reps ?? 10),
  load: exercise.loadKg == null ? "" : String(exercise.loadKg), rpe: "", rir: "",
})
const initialDraft = (workout: Workout): ExerciseDraft[] => workout.exercises.map((template) => ({
  template, sets: Array.from({ length: Math.min(20, Math.max(1, Number(template.sets) || 3)) }, () => initialSet(template)),
  completed: false, rest: String(template.restSec ?? 90),
  duration: template.durationSec ? String(Math.round(template.durationSec / 60)) : "20", distance: "",
}))

interface Props {
  workout: Workout | null
  history: TrainingSessionLog[]
  effortMetricsAvailable?: boolean
  onClose: () => void
  onSave: (record: Omit<TrainingSessionLog, "id"> & { id?: string }) => Promise<void>
}
export function TrainingLiveModal({ workout, history, effortMetricsAvailable = true, onClose, onSave }: Props) {
  const [rows, setRows] = useState<ExerciseDraft[]>([])
  const [sessionId, setSessionId] = useState(() => wid("ts"))
  const [date, setDate] = useState(localDate)
  const [startedAt, setStartedAt] = useState(() => Date.now())
  const [restUntil, setRestUntil] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [saving, setSaving] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => {
    if (!workout) return
    setRows(initialDraft(workout)); setSessionId(wid("ts")); setDate(localDate())
    setStartedAt(Date.now()); setRestUntil(null); setError(""); setConfirmDiscard(false)
  }, [workout])
  useEffect(() => {
    if (!workout) return
    const clock = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(clock)
  }, [workout])
  const restSeconds = restUntil === null ? 0 : Math.max(0, Math.ceil((restUntil - now) / 1000))
  const formatTime = (seconds: number) => [Math.floor(seconds / 60), seconds % 60].map((n) => String(n).padStart(2, "0")).join(":")
  const completeSets = rows.reduce((sum, row) => sum + (row.template.modality === "forca" || row.template.modality === "calistenia" || !row.template.modality ? row.sets.filter((set) => set.done).length : Number(row.completed)), 0)
  const totalSets = rows.reduce((sum, row) => sum + (["forca", "calistenia"].includes(row.template.modality ?? "forca") ? row.sets.length : 1), 0)
  const completedVolume = rows.reduce((sum, row) => sum + row.sets.filter((set) => set.done).reduce((part, set) => part + (Number(set.load.replace(",", ".")) || 0) * (Number(set.reps) || 0), 0), 0)
  const lastSession = useMemo(() => history.filter((s) => s.workoutId === workout?.id).sort((a, b) => b.date.localeCompare(a.date))[0] ?? null, [history, workout?.id])
  const updateRow = (id: string, patch: Partial<ExerciseDraft>) => setRows((all) => all.map((row) => row.template.id === id ? { ...row, ...patch } : row))
  const updateSet = (exerciseId: string, setId: string, patch: Partial<SetDraft>) => setRows((all) => all.map((row) => row.template.id === exerciseId ? {
    ...row, sets: row.sets.map((set) => set.id === setId ? { ...set, ...patch } : set),
  } : row))
  const toggleSet = (exerciseId: string, setId: string) => {
    const row = rows.find((item) => item.template.id === exerciseId)
    const set = row?.sets.find((item) => item.id === setId)
    if (!row || !set) return
    updateSet(exerciseId, setId, { done: !set.done })
    if (!set.done) {
      const seconds = Number(row.rest)
      if (Number.isInteger(seconds) && seconds > 0 && seconds <= 7200) { setRestUntil(Date.now() + seconds * 1000); setNow(Date.now()) }
    }
  }
  const close = () => {
    if (saving) return
    if (completeSets) { setConfirmDiscard(true); return }
    onClose()
  }
  const submit = async () => {
    if (!workout || saving) return
    try {
      const exercises: SessionExercise[] = []
      if (!date || date > localDate()) throw new Error("Revise a data da sessão.")
      for (const row of rows) {
        const modality = row.template.modality ?? "forca"
        const restSec = value(row.rest, 0, 7200, row.template.name + ": descanso")
        if (modality === "forca" || modality === "calistenia") {
          for (const set of row.sets.filter((item) => item.done)) {
            const reps = value(set.reps, 1, 10000, row.template.name + ": repetições", true)
            if (!Number.isInteger(reps)) throw new Error("Repetições precisam ser inteiras.")
            const rpe = effortMetricsAvailable ? value(set.rpe, 1, 10, row.template.name + ": RPE") : null
            if (rpe !== null && !Number.isInteger(rpe * 2)) throw new Error("RPE: use intervalos de 0,5.")
            const rir = effortMetricsAvailable ? value(set.rir, 0, 10, row.template.name + ": RIR") : null
            if (rir !== null && !Number.isInteger(rir)) throw new Error("RIR deve ser inteiro.")
            const loadKg = modality === "forca" ? value(set.load, 0, 2000, row.template.name + ": carga") : null
            exercises.push({ id: set.id, name: row.template.name, modality, sets: 1, reps, loadKg, restSec,
              rpe, rir, progressionLevel: modality === "calistenia" ? row.template.progressionLevel ?? null : null })
          }
        } else if (row.completed) {
          const durationMin = value(row.duration, 1, 2880, row.template.name + ": duração", true)!
          const distanceKm = modality === "cardio" ? value(row.distance, 0, 1000, row.template.name + ": distância", true) : null
          exercises.push({ id: wid("ex"), name: row.template.name, modality, restSec, durationSec: durationMin * 60, distanceKm })
        }
      }
      if (!exercises.length) throw new Error("Conclua ao menos uma série ou atividade.")
      if (exercises.length > 100) throw new Error("Uma sessão permite até 100 registros de séries.")
      setSaving(true); setError("")
      await onSave({ id: sessionId, workoutId: workout.id, name: workout.name, modality: exercises[0].modality,
        date, durationSec: Math.min(172800, Math.max(1, Math.ceil((Date.now() - startedAt) / 1000))), source: "manual", exercises })
      setRestUntil(null)
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar seu treino.")
    } finally { setSaving(false) }
  }
  return (
    <Modal isOpen={Boolean(workout)} onClose={close} title={workout ? "Sessão ativa · " + workout.name : "Sessão ativa"}
      description="Marque cada série realmente realizada. Nenhum registro é enviado antes de finalizar." icon="fitness_center" maxWidth="max-w-5xl">
      <div className="space-y-5">
        <div className="relative overflow-hidden rounded-xl border border-primary/25 bg-surface p-4">
          <div aria-hidden="true" className="absolute -right-10 -top-16 size-44 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">Treino em andamento</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-on-surface">{formatTime(Math.floor((now - startedAt) / 1000))}</p>
              <p className="mt-1 text-xs text-muted">{completeSets} de {totalSets} séries/atividades feitas · {completedVolume.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg de volume</p>
            </div>
            <label className="text-[11px] font-semibold text-muted">Data<LevelDateInput className="mt-1" max={localDate()} value={date} onChange={(e) => setDate(e.target.value)} /></label>
          </div>
          <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-outline-variant"><div className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none" style={{ width: (totalSets ? completeSets / totalSets * 100 : 0) + "%" }} /></div>
        </div>
        <div aria-live="polite" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className={"grid size-10 place-items-center rounded-lg " + (restSeconds ? "bg-primary/15 text-primary" : "bg-surface-container text-muted")}><Timer className="size-5" /></span>
            <div><p className="text-sm font-semibold text-on-surface">Intervalo de descanso</p><p className="text-xs text-muted">{restSeconds ? "Cronômetro baseado no horário real" : "Conclua uma série para iniciar"}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <output aria-label="Tempo restante de descanso" className="font-mono text-xl font-semibold tabular-nums text-on-surface">{formatTime(restSeconds)}</output>
            {restSeconds ? <Button type="button" variant="secondary" size="sm" onClick={() => setRestUntil(null)}><Pause className="size-3.5" /> Pular</Button> :
              <Button type="button" variant="ghost" size="sm" onClick={() => { setRestUntil(Date.now() + 90_000); setNow(Date.now()) }}><RotateCcw className="size-3.5" /> 90 s</Button>}
          </div>
        </div>
        {lastSession ? <div className="rounded-xl border border-outline-variant bg-primary/5 px-4 py-3 text-xs text-on-surface-variant">
          Última execução desta ficha: <strong className="text-on-surface">{new Date(lastSession.date + "T12:00:00").toLocaleDateString("pt-BR")}</strong>.
          Compare suas cargas realizadas abaixo; as metas podem ser ajustadas individualmente.
        </div> : null}
        <div className="space-y-3">
          {rows.map((row, index) => {
            const modality = row.template.modality ?? "forca"
            const strength = modality === "forca" || modality === "calistenia"
            const done = strength ? row.sets.filter((set) => set.done).length : Number(row.completed)
            const priorLoads = lastSession?.exercises.filter((exercise) => exercise.name.toLocaleLowerCase("pt-BR") === row.template.name.toLocaleLowerCase("pt-BR") && exercise.loadKg !== null && exercise.loadKg !== undefined).map((exercise) => exercise.loadKg!) ?? []
            const maxPrior = priorLoads.length ? Math.max(...priorLoads) : null
            const historicalBest = bestExerciseLoad(history, row.template.name)
            const potentialRecord = historicalBest !== null && row.sets.some((set) => set.done && Number(set.load.replace(",", ".")) > historicalBest)
            return <article key={row.template.id} className="overflow-hidden rounded-xl border border-outline-variant bg-surface/65">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant p-3 sm:p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-xs font-semibold text-primary">{String(index + 1).padStart(2, "0")}</span>
                  <div className="min-w-0"><h3 className="truncate text-sm font-semibold text-on-surface">{row.template.name}</h3>
                    <p className="mt-1 text-[11px] text-muted">{strength ? done + "/" + row.sets.length + " séries" : modality}
                    {maxPrior !== null ? " · na última ficha: " + maxPrior.toLocaleString("pt-BR") + " kg" : ""}
                    {historicalBest !== null ? " · recorde histórico: " + historicalBest.toLocaleString("pt-BR") + " kg" : ""}
                    {potentialRecord ? " · acima do recorde anterior (ao finalizar)" : ""}</p>
                  </div>
                </div>
                {strength ? <div className="flex items-center gap-2">
                  <label className="text-[11px] text-muted">Descanso (s)<input aria-label={"Descanso de " + row.template.name} value={row.rest} inputMode="numeric" onChange={(e) => updateRow(row.template.id, { rest: e.target.value })} className={field + " ml-1 w-17 text-center"} /></label>
                  <Button size="sm" variant="secondary" disabled={row.sets.length >= 20} onClick={() => updateRow(row.template.id, { sets: [...row.sets, initialSet(row.template)] })}><Plus className="size-3.5" /> Série</Button>
                </div> : null}
              </header>
              {strength ? <div className="overflow-x-auto p-2 sm:p-3">
                <div className="min-w-[510px] space-y-1.5">
                  <div className="grid grid-cols-[2.5rem_4.5rem_1fr_1fr_1fr_1fr_2.2rem] gap-1.5 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    <span>Set</span><span>Status</span><span>Reps</span><span>Kg</span><span title="Esforço percebido (1–10)">RPE</span><span title="Repetições em reserva (0–10)">RIR</span><span></span>
                  </div>
                  {row.sets.map((set, setIndex) => <div key={set.id} className={"grid grid-cols-[2.5rem_4.5rem_1fr_1fr_1fr_1fr_2.2rem] items-center gap-1.5 rounded-lg px-2 py-1.5 " + (set.done ? "bg-primary/7" : "bg-surface-container/60")}>
                    <span className="text-xs font-bold tabular-nums text-muted">{String(setIndex + 1).padStart(2, "0")}</span>
                    <button type="button" aria-label={set.done ? "Desmarcar série " + (setIndex + 1) + " de " + row.template.name : "Concluir série " + (setIndex + 1) + " de " + row.template.name} aria-pressed={set.done} onClick={() => toggleSet(row.template.id, set.id)}
                      className={"flex min-h-10 items-center justify-center gap-1 rounded-md text-xs font-semibold " + (set.done ? "bg-primary text-on-primary" : "border border-outline-variant text-muted hover:text-primary")}>{set.done ? <Check className="size-4" /> : <Circle className="size-3.5" />}{set.done ? "Feito" : "Fazer"}</button>
                    <input aria-label={"Repetições série " + (setIndex + 1) + " de " + row.template.name} inputMode="numeric" value={set.reps} onChange={(e) => updateSet(row.template.id, set.id, { reps: e.target.value })} className={field} />
                    <input aria-label={"Carga série " + (setIndex + 1) + " de " + row.template.name} inputMode="decimal" placeholder="–" value={set.load} disabled={modality !== "forca"} onChange={(e) => updateSet(row.template.id, set.id, { load: e.target.value })} className={field} />
                    <input aria-label={"RPE série " + (setIndex + 1) + " de " + row.template.name} inputMode="decimal" placeholder="1–10" disabled={!effortMetricsAvailable} title={effortMetricsAvailable ? "Esforço percebido" : "Indisponível até a migração do banco de dados"} value={effortMetricsAvailable ? set.rpe : ""} onChange={(e) => updateSet(row.template.id, set.id, { rpe: e.target.value })} className={field} />
                    <input aria-label={"RIR série " + (setIndex + 1) + " de " + row.template.name} inputMode="numeric" placeholder="0–10" disabled={!effortMetricsAvailable} title={effortMetricsAvailable ? "Repetições em reserva" : "Indisponível até a migração do banco de dados"} value={effortMetricsAvailable ? set.rir : ""} onChange={(e) => updateSet(row.template.id, set.id, { rir: e.target.value })} className={field} />
                    <button type="button" disabled={row.sets.length <= 1} title="Remover esta série" aria-label={"Excluir série " + (setIndex + 1) + " de " + row.template.name} className="grid size-9 place-items-center text-muted hover:text-error disabled:opacity-30" onClick={() => updateRow(row.template.id, { sets: row.sets.filter((item) => item.id !== set.id) })}><Trash2 className="size-4" /></button>
                  </div>)}
                </div>
              </div> : <div className="grid gap-3 p-4 sm:grid-cols-3">
                <label className="text-xs font-semibold text-muted">Duração (min)<input aria-label={"Duração de " + row.template.name} inputMode="numeric" className={field + " mt-1"} value={row.duration} onChange={(e) => updateRow(row.template.id, { duration: e.target.value })} /></label>
                {modality === "cardio" ? <label className="text-xs font-semibold text-muted">Distância (km)<input aria-label={"Distância de " + row.template.name} inputMode="decimal" placeholder="Ex.: 3,5" className={field + " mt-1"} value={row.distance} onChange={(e) => updateRow(row.template.id, { distance: e.target.value })} /></label> : null}
                <button type="button" aria-pressed={row.completed} onClick={() => updateRow(row.template.id, { completed: !row.completed })} className={"mt-auto flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold " + (row.completed ? "border-primary/40 bg-primary/10 text-primary" : "border-outline-variant text-muted")}>{row.completed ? <CheckCircle2 className="size-4" /> : <Play className="size-4" />}{row.completed ? "Atividade concluída" : "Marcar concluída"}</button>
              </div>}
            </article>
          })}
        </div>
        <p className="text-xs leading-5 text-muted">{effortMetricsAvailable ? "RPE: esforço percebido de 1 a 10. RIR: repetições em reserva. Ambos são opcionais, por série concluída." : "RPE/RIR temporariamente indisponíveis: o banco de produção ainda precisa da migração. O registro de séries, cargas, repetições e descanso continua ativo, sem descartar o treino."}</p>
        {error ? <p role="alert" className="rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">{error}</p> : null}
        {confirmDiscard ? <div role="alertdialog" aria-label="Confirmação de descarte" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-error/30 bg-error/5 p-3">
          <p className="min-w-0 flex-1 text-xs leading-5 text-on-surface">Seu treino ainda não foi salvo. Deseja descartar as séries marcadas?</p>
          <Button variant="secondary" size="sm" onClick={() => setConfirmDiscard(false)}>Continuar treino</Button>
          <Button variant="destructive" size="sm" onClick={() => { setRestUntil(null); onClose() }}>Descartar sessão</Button>
        </div> : null}
        <footer className="flex flex-wrap justify-between gap-3 border-t border-outline-variant pt-4">
          <Button type="button" variant="ghost" onClick={close} disabled={saving}>Descartar</Button>
          <Button type="button" variant="primary" disabled={saving || !completeSets} onClick={() => void submit()}>
            <CheckCircle2 className="size-4" />{saving ? "Salvando sessão..." : "Finalizar treino · " + completeSets + " registro(s)"}
          </Button>
        </footer>
      </div>
    </Modal>
  )
}
