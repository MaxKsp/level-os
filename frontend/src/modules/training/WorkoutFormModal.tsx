import { useEffect, useState } from "react"
import { Modal } from "../../components/ui/Modal"
import { Button } from "../../components/ui/Button"
import { Icon } from "../../design-system"
import type { Workout, WorkoutExercise } from "./contracts"
import { wid } from "./store"
import { findExerciseVideo } from "./exerciseVideos"

const field = "w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none transition-colors focus:border-primary"
const lbl = "mb-1 block text-xs font-medium text-on-surface-variant"

const emptyEx = (): WorkoutExercise => ({ id: wid("e"), name: "", sets: "3", reps: "12" })

interface Props {
  open: boolean
  initial?: Workout | null
  onClose: () => void
  onSave: (w: Workout) => void
}

export function WorkoutFormModal({ open, initial, onClose, onSave }: Props) {
  const [name, setName] = useState("")
  const [focus, setFocus] = useState("")
  const [exs, setExs] = useState<WorkoutExercise[]>([emptyEx()])
  const [err, setErr] = useState("")

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "")
      setFocus(initial?.focus ?? "")
      setExs(initial?.exercises.length ? initial.exercises.map((e) => ({ ...e })) : [emptyEx()])
      setErr("")
    }
  }, [open, initial])

  const setEx = (id: string, patch: Partial<WorkoutExercise>) =>
    setExs((xs) => xs.map((e) => (e.id === id ? { ...e, ...patch } : e)))

  const submit = () => {
    if (!name.trim()) { setErr("Dê um nome ao treino."); return }
    const clean = exs.filter((e) => e.name.trim())
    if (clean.length === 0) { setErr("Adicione ao menos um exercício."); return }
    onSave({ id: initial?.id ?? wid(), name: name.trim(), focus: focus.trim(), exercises: clean })
    onClose()
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={initial ? "Editar treino" : "Novo treino"} icon="fitness_center" maxWidth="max-w-xl">
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={lbl}>Nome do treino</label><input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Superior A" autoFocus /></div>
          <div><label className={lbl}>Foco (opcional)</label><input className={field} value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="Ex.: Peito e tríceps" /></div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className={lbl + " mb-0"}>Exercícios</span>
            <button onClick={() => setExs((xs) => [...xs, emptyEx()])} className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-primary hover:bg-surface-container-high">
              <Icon name="add" className="text-[16px]" /> Adicionar
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {exs.map((e, i) => {
              const videoUrl = findExerciseVideo(e.name)
              return (
                <div key={e.id} className="flex items-center gap-2">
                  <input className={field + " flex-1"} value={e.name} onChange={(ev) => setEx(e.id, { name: ev.target.value })} placeholder={`Exercício ${i + 1}`} />
                  <input className={field + " w-16 text-center"} value={e.sets} onChange={(ev) => setEx(e.id, { sets: ev.target.value })} aria-label="Séries" title="Séries" />
                  <span className="text-muted">×</span>
                  <input className={field + " w-16 text-center"} value={e.reps} onChange={(ev) => setEx(e.id, { reps: ev.target.value })} aria-label="Repetições" title="Repetições" />
                  {videoUrl ? (
                    <a href={videoUrl} target="_blank" rel="noreferrer" aria-label={`Tutorial de ${e.name}`} title="Ver tutorial" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-container-high hover:text-primary">
                      <Icon name="play_circle" className="text-[18px]" />
                    </a>
                  ) : null}
                  <button aria-label="Remover exercício" onClick={() => setExs((xs) => (xs.length > 1 ? xs.filter((x) => x.id !== e.id) : xs))} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-container-high hover:text-error">
                    <Icon name="close" className="text-[18px]" />
                  </button>
                </div>
              )
            })}
          </div>
          <p className="mt-1 text-xs text-muted">Colunas: exercício · séries × repetições.</p>
        </div>

        {err ? <p className="text-sm text-error">{err}</p> : null}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="md" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" size="md" onClick={submit}>{initial ? "Salvar treino" : "Criar treino"}</Button>
        </div>
      </div>
    </Modal>
  )
}
