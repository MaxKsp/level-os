import { useMemo, useState } from "react"
import { Activity, Bike, Dumbbell, ExternalLink, Plus, Search, Waves } from "lucide-react"
import { findExerciseVideo } from "./exerciseVideos"
import { searchExercises, type LibraryExercise, type MuscleGroup } from "./exerciseCatalog"
const groups: Array<MuscleGroup | "Todos"> = ["Todos", "Peito", "Costas", "Pernas", "Ombros", "Braços", "Core", "Cardio", "Mobilidade"]
const icons = { forca: Dumbbell, cardio: Bike, calistenia: Activity, mobilidade: Waves }
export function ExerciseLibraryPicker({ onSelect }: { onSelect: (exercise: LibraryExercise) => void }) {
  const [query, setQuery] = useState("")
  const [group, setGroup] = useState<MuscleGroup | "Todos">("Todos")
  const filtered = useMemo(() => searchExercises(query, group), [query, group])
  return <section aria-label="Biblioteca de exercícios" className="space-y-3 rounded-xl border border-outline-variant bg-surface/50 p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h3 className="text-sm font-semibold text-on-surface">Biblioteca de movimentos</h3><p className="mt-1 text-[11px] text-muted">Selecione para adicionar à ficha.</p></div>
      <span className="rounded-md bg-primary/10 px-2 py-1 text-[10px] text-primary">{filtered.length} movimentos</span>
    </div>
    <label className="flex min-h-10 items-center gap-2 rounded-lg border border-outline-variant bg-surface-container px-3">
      <Search className="size-4 shrink-0 text-muted" />
      <input className="w-full min-w-0 bg-transparent text-sm text-on-surface outline-none placeholder:text-muted" aria-label="Buscar exercícios" placeholder="Nome, grupo ou equipamento" value={query} onChange={(e) => setQuery(e.target.value)} />
    </label>
    <div className="flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Grupos musculares">
      {groups.map((item) => <button key={item} type="button" aria-pressed={group === item} onClick={() => setGroup(item)}
        className={"min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold " + (group === item ? "border-primary/40 bg-primary/10 text-primary" : "border-outline-variant text-muted hover:text-on-surface")}>{item}</button>)}
    </div>
    <div className="grid max-h-[19rem] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
      {filtered.map((item) => {
        const Symbol = icons[item.modality]
        const tutorial = findExerciseVideo(item.name)
        return <article key={item.name} className="group flex min-w-0 flex-col rounded-lg border border-outline-variant bg-surface-container/55 p-3 transition-colors hover:border-primary/35">
          <div className="flex items-start gap-2.5">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-primary/15 bg-[radial-gradient(circle_at_top,rgba(49,230,212,.18),transparent_80%)] text-primary">
              <Symbol className="size-5" strokeWidth={1.5} />
            </span>
            <div className="min-w-0"><h4 className="text-xs font-semibold text-on-surface">{item.name}</h4>
              <p className="mt-1 text-[10px] text-muted">{item.group} · {item.equipment}</p>
              <p className="mt-1.5 text-[11px] leading-4 text-on-surface-variant">{item.cue}</p>
            </div>
          </div>
          <div className="mt-auto flex items-center justify-end gap-2 pt-3">
            {tutorial ? <a href={tutorial} target="_blank" rel="noopener noreferrer" aria-label={"Consultar tutorial de " + item.name} className="inline-flex min-h-9 items-center gap-1 text-[11px] text-muted hover:text-primary">Referência <ExternalLink className="size-3" /></a> : null}
            <button type="button" className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 text-[11px] font-semibold text-primary hover:bg-primary/15" onClick={() => onSelect(item)}>
              <Plus className="size-3.5" />Adicionar
            </button>
          </div>
        </article>
      })}
      {!filtered.length ? <p className="col-span-full py-6 text-center text-xs text-muted">Nenhum exercício encontrado; você também pode cadastrar manualmente.</p> : null}
    </div>
  </section>
}
