import { useState } from "react"
import { BookOpenCheck, ExternalLink, LoaderCircle } from "lucide-react"
import { Modal } from "../../components/ui/Modal"
import { fetchTrainingLibrary } from "./trainingKnowledge"
import { NativeTrainingVideo } from "./NativeTrainingVideo"
import type { LibraryExercise } from "./exerciseCatalog"

const key = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim()

export function ExerciseReferenceButton({ name }: { name: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [exercise, setExercise] = useState<LibraryExercise | null>(null)
  const [error, setError] = useState("")

  const show = async () => {
    setOpen(true)
    if (!name.trim() || exercise || loading) return
    setLoading(true); setError("")
    try {
      const data = await fetchTrainingLibrary({ query: name, limit: 8 })
      const exact = data.items.find((item) => key(item.name) === key(name))
      setExercise(exact ?? data.items[0] ?? null)
      if (!exact && !data.items.length) setError("Não encontrei uma referência licenciada para este nome.")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Referência indisponível.")
    } finally { setLoading(false) }
  }
  return <>
    <button type="button" onClick={() => void show()} aria-label={"Como executar " + name} title="Como executar"
      className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-primary/10 hover:text-primary">
      <BookOpenCheck className="size-4" />
    </button>
    <Modal isOpen={open} onClose={() => setOpen(false)} title={exercise?.name ?? (name || "Referência do exercício")}
      description="Execução, equipamento e vídeo nativo de referência. Confira a máquina e seus ajustes específicos." icon="fitness_center" maxWidth="max-w-4xl">
      {loading ? <p role="status" className="flex items-center gap-2 py-8 text-sm text-muted"><LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />Carregando referência…</p> : null}
      {error ? <p role="alert" className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-on-surface">{error}</p> : null}
      {exercise ? <div className="space-y-4">
        <NativeTrainingVideo exercise={exercise} />
        <div className="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
          <div>{exercise.imageUrl ? <img src={exercise.imageUrl} alt={"Referência de " + exercise.name}
            className="aspect-square w-full rounded-xl border border-outline-variant bg-surface-container object-contain" /> :
            <div className="grid aspect-square place-items-center rounded-xl border border-dashed border-outline-variant text-xs text-muted">Sem imagem nesta fonte</div>}</div>
          <div className="min-w-0"><p className="text-xs font-semibold text-primary">{exercise.group} · {exercise.equipment}</p>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-on-surface-variant">{exercise.instructions || exercise.cue}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {exercise.sourceUrl ? <a href={exercise.sourceUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-outline-variant px-3 text-xs font-semibold text-on-surface">
                Fonte <ExternalLink className="size-3.5" /></a> : null}
            </div>
            {exercise.license ? <p className="mt-4 text-[10px] leading-4 text-muted">Conteúdo Wger · {exercise.license}{exercise.author ? " · " + exercise.author : ""}.</p> : null}
            {exercise.imageUrl && exercise.imageLicense ? <p className="mt-1 text-[10px] leading-4 text-muted">Imagem · {exercise.imageLicense}{exercise.imageAuthor ? " · " + exercise.imageAuthor : ""}.</p> : null}
            {exercise.video?.license ? <p className="mt-1 text-[10px] leading-4 text-muted">Vídeo · {exercise.video.license}{exercise.video.author ? " · " + exercise.video.author : ""}.</p> : null}
            <p className="mt-2 text-[10px] leading-4 text-muted">Conteúdo educacional geral. Ajuste a máquina à sua estrutura e não force amplitude dolorosa.</p>
          </div>
        </div>
      </div> : null}
    </Modal>
  </>
}
