import { useEffect, useState } from "react"
import { Modal } from "../../components/ui/Modal"
import { Button } from "../../components/ui/button"
import { Icon } from "../../design-system"
import type { Workout, WorkoutExercise } from "./contracts"
import { wid } from "./store"
import { ExerciseReferenceButton } from "./ExerciseReferenceButton"
import { ExerciseLibraryPicker } from "./ExerciseLibraryPicker"

const field = "w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none transition-colors focus:border-primary"
const lbl = "mb-1 block text-xs font-medium text-on-surface-variant"

const emptyEx = (): WorkoutExercise => ({ id: wid("e"), name: "", sets: "3", reps: "12" })

interface Props {
  open: boolean
  initial?: Workout | null
  onClose: () => void
  onSave: (w: Workout) => Promise<void> | void
}

export function WorkoutFormModal({ open, initial, onClose, onSave }: Props) {
  const [name, setName] = useState("")
  const [focus, setFocus] = useState("")
  const [exs, setExs] = useState<WorkoutExercise[]>([emptyEx()])
  const [draftId, setDraftId] = useState(() => wid())
  const [err, setErr] = useState("")
  const [saving, setSaving] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)

  useEffect(() => {
    if (open) {
      setDraftId(initial?.id ?? wid())
      setName(initial?.name ?? "")
      setFocus(initial?.focus ?? "")
      setExs(initial?.exercises.length ? initial.exercises.map((e) => ({ ...e })) : [emptyEx()])
      setErr("")
      setLibraryOpen(false)
    }
  }, [open, initial])

  const setEx = (id: string, patch: Partial<WorkoutExercise>) =>
    setExs((xs) => xs.map((e) => (e.id === id ? { ...e, ...patch } : e)))

  const submit = async () => {
    if (saving) return
    if (!name.trim()) { setErr("Dê um nome ao treino."); return }
    const clean = exs.filter((e) => e.name.trim())
    if (clean.length === 0) { setErr("Adicione ao menos um exercício."); return }
    const positiveInt = (value: number | string | null, max: number) => {
      const num = Number(value)
      return Number.isInteger(num) && num >= 1 && num <= max
    }
    for (const entry of clean) {
      if (!positiveInt(entry.sets, 100) || !positiveInt(entry.reps, 10000)) {
        setErr(`Revise séries e repetições de ${entry.name}.`); return
      }
      if (entry.loadKg != null && (!Number.isFinite(entry.loadKg) || entry.loadKg < 0 || entry.loadKg > 2000)) {
        setErr(`Carga inválida em ${entry.name}.`); return
      }
      if (entry.restSec != null && (!Number.isInteger(entry.restSec) || entry.restSec < 0 || entry.restSec > 7200)) {
        setErr(`Descanso inválido em ${entry.name}.`); return
      }
    }
    try {
      setSaving(true)
      setErr("")
      await onSave({ id: draftId, name: name.trim(), focus: focus.trim(), exercises: clean })
      onClose()
    } catch (cause) {
      setErr(cause instanceof Error ? cause.message : "Não foi possível salvar o treino.")
    } finally { setSaving(false) }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={initial ? "Editar treino" : "Novo treino"} icon="fitness_center" maxWidth="max-w-3xl">
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={lbl}>Nome do treino</label><input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Superior A" autoFocus /></div>
          <div><label className={lbl}>Foco (opcional)</label><input className={field} value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="Ex.: Peito e tríceps" /></div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className={lbl + " mb-0"}>Exercícios</span>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setLibraryOpen((value) => !value)} className="flex min-h-9 items-center gap-1 rounded-lg border border-primary/25 bg-primary/10 px-2.5 text-xs font-semibold text-primary">{libraryOpen ? "Fechar biblioteca" : "Explorar biblioteca"}</button>
            <button onClick={() => setExs((xs) => [...xs, emptyEx()])} className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-primary hover:bg-surface-container-high">
              <Icon name="add" className="text-[16px]" /> Adicionar
            </button></div>
          </div>
          {libraryOpen ? <div className="mb-4"><ExerciseLibraryPicker onSelect={(item) => {
            setExs((current) => [...current, { id: wid("e"), name: item.name, modality: item.modality, sets: "3", reps: "10", restSec: 90 }])
            setErr("")
          }} /></div> : null}
          <div className="flex flex-col gap-2">
            {exs.map((e, i) => {
              return (
                <div key={e.id} className="rounded-xl border border-outline-variant bg-surface/60 p-3">
                  <div className="mb-3 flex items-start gap-2">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{String(i + 1).padStart(2, "0")}</span>
                    <label className="min-w-0 flex-1 text-[11px] font-medium text-muted">Exercício
                      <input className={field + " mt-1 min-h-10"} value={e.name} onChange={(ev) => setEx(e.id, { name: ev.target.value })} placeholder={`Exercício ${i + 1}`} />
                    </label>
                    {e.name.trim() ? <span className="mt-5"><ExerciseReferenceButton name={e.name} /></span> : null}
                    <button type="button" aria-label={`Remover ${e.name || "exercício"}`} onClick={() => setExs((xs) => (xs.length > 1 ? xs.filter((x) => x.id !== e.id) : xs))} className="mt-5 grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-container-high hover:text-error">
                      <Icon name="close" className="text-[18px]" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <label className="min-w-0 text-[11px] font-medium text-muted">Séries
                      <input className={field + " mt-1 min-h-10"} inputMode="numeric" value={String(e.sets ?? "")} onChange={(ev) => setEx(e.id, { sets: ev.target.value })} />
                    </label>
                    <label className="min-w-0 text-[11px] font-medium text-muted">Repetições
                      <input className={field + " mt-1 min-h-10"} inputMode="numeric" value={String(e.reps ?? "")} onChange={(ev) => setEx(e.id, { reps: ev.target.value })} />
                    </label>
                    <label className="min-w-0 text-[11px] font-medium text-muted">Carga prevista (kg)
                      <input className={field + " mt-1 min-h-10"} inputMode="decimal" placeholder="Opcional" value={e.loadKg == null ? "" : String(e.loadKg)} onChange={(ev) => setEx(e.id, { loadKg: ev.target.value === "" ? null : Number(ev.target.value.replace(",", ".")) })} />
                    </label>
                    <label className="min-w-0 text-[11px] font-medium text-muted">Descanso (seg)
                      <input className={field + " mt-1 min-h-10"} inputMode="numeric" placeholder="Opcional" value={e.restSec == null ? "" : String(e.restSec)} onChange={(ev) => setEx(e.id, { restSec: ev.target.value === "" ? null : Number(ev.target.value) })} />
                    </label>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-muted">As cargas são metas da ficha. Ao iniciar o treino, registre os valores realmente realizados.</p>
        </div>

        {err ? <p className="text-sm text-error">{err}</p> : null}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="md" disabled={saving} onClick={onClose}>Cancelar</Button>
          <Button variant="primary" size="md" disabled={saving} onClick={()=>void submit()}>{saving ? "Salvando..." : initial ? "Salvar treino" : "Criar treino"}</Button>
        </div>
      </div>
    </Modal>
  )
}
