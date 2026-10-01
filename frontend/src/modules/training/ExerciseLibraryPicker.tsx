import { useEffect, useMemo, useState } from "react"
import { Activity, Bike, Dumbbell, ExternalLink, LibraryBig, LoaderCircle, Play, Plus, RotateCcw, Search, Waves } from "lucide-react"
import { LevelSelect } from "../../components/ui/LevelSelect"
import { EXERCISE_CATALOG, searchExercises, type LibraryExercise, type MuscleGroup } from "./exerciseCatalog"
import { fetchTrainingLibrary } from "./trainingKnowledge"
import { TrainingVideoModal } from "./NativeTrainingVideo"

const groups: Array<MuscleGroup | "Todos"> = ["Todos", "Peito", "Costas", "Pernas", "Ombros", "Braços", "Core", "Cardio", "Mobilidade"]
const icons = { forca: Dumbbell, cardio: Bike, calistenia: Activity, mobilidade: Waves }
type Props = {
  onSelect?: (exercise: LibraryExercise) => void
  title?: string
  description?: string
  compact?: boolean
}

export function ExerciseLibraryPicker({
  onSelect, title = "Biblioteca de movimentos",
  description = "Pesquise exercícios, músculos e equipamentos com instruções e referências.",
  compact = false,
}: Props) {
  const [query, setQuery] = useState("")
  const [group, setGroup] = useState<MuscleGroup | "Todos">("Todos")
  const [equipment, setEquipment] = useState("")
  const [videoOnly, setVideoOnly] = useState(false)
  const [items, setItems] = useState<LibraryExercise[]>([])
  const [equipmentOptions, setEquipmentOptions] = useState<string[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState("")
  const [attribution, setAttribution] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [videoExercise, setVideoExercise] = useState<LibraryExercise | null>(null)

  const fallback = useMemo(() => searchExercises(query, group)
    .filter((item) => (!equipment || item.equipment.toLocaleLowerCase("pt-BR").includes(equipment.toLocaleLowerCase("pt-BR"))) && (!videoOnly || Boolean(item.video?.url)))
    .slice(0, 36), [query, group, equipment, videoOnly])

  useEffect(() => {
    if (!window.CSRF_TOKEN) {
      setItems(fallback); setTotal(fallback.length); setError(""); setAttribution("")
      return
    }
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setLoading(true); setError("")
      void fetchTrainingLibrary({ query, group, equipment, videoOnly, limit: 36 }, controller.signal)
        .then((data) => {
          setItems(data.items); setTotal(data.total)
          setEquipmentOptions(data.equipmentOptions); setAttribution(data.attribution)
        })
        .catch((cause) => {
          if (controller.signal.aborted) return
          setItems(fallback); setTotal(fallback.length)
          setError(cause instanceof Error ? cause.message + " Exibindo catálogo local." : "Exibindo catálogo local.")
        })
        .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }, 260)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [query, group, equipment, videoOnly, fallback])
  const loadMore = async () => {
    if (loadingMore || items.length >= total || !window.CSRF_TOKEN) return
    setLoadingMore(true)
    try {
      const data = await fetchTrainingLibrary({ query, group, equipment, videoOnly, limit: 36, offset: items.length })
      setItems((current) => [...current, ...data.items])
      setTotal(data.total); setEquipmentOptions(data.equipmentOptions); setAttribution(data.attribution)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar mais exercícios.")
    } finally { setLoadingMore(false) }
  }
  const equipmentSelect = [{ value: "", label: "Todos os equipamentos" },
    ...equipmentOptions.map((value) => ({ value, label: value }))]
  const hasFilters = Boolean(query.trim() || group !== "Todos" || equipment || videoOnly)
  const clearFilters = () => {
    setQuery("")
    setGroup("Todos")
    setEquipment("")
    setVideoOnly(false)
  }

  return <section aria-label="Biblioteca de exercícios" className={compact
    ? "space-y-4 rounded-2xl border border-outline-variant bg-surface/50 p-3 sm:p-4"
    : "space-y-4 border-t border-outline-variant/80 pt-5"}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-primary">
          <LibraryBig className="size-3.5" /> Biblioteca de exercícios
        </span>
        <h3 className="mt-1 text-lg font-semibold text-on-surface">{title}</h3>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-on-surface-variant">{description}</p>
      </div>
      <span className="rounded-full border border-outline bg-surface-container-high px-3 py-1.5 text-xs font-semibold text-on-surface">
        {loading ? "Atualizando…" : total.toLocaleString("pt-BR") + " resultados"}
      </span>
    </div>
    <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3 sm:p-4">
      <div className="grid items-end gap-3 md:grid-cols-[minmax(0,1fr)_11rem_13rem_11rem]">
        <div>
          <label htmlFor="training-library-search" className="mb-1.5 block text-xs font-semibold text-on-surface-variant">Buscar exercício</label>
          <div className="flex min-h-11 items-center gap-2 rounded-lg border border-outline bg-surface-container px-3 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
            <Search className="size-4 shrink-0 text-on-surface-variant" />
            <input id="training-library-search" className="w-full min-w-0 bg-transparent text-sm text-on-surface outline-none placeholder:text-muted"
              placeholder="Nome, músculo ou equipamento" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
        <LevelSelect label="Grupo muscular" value={group} onChange={setGroup}
          options={groups.map((value) => ({ value, label: value === "Todos" ? "Todos os grupos" : value }))} />
        <LevelSelect label="Equipamento" value={equipment} onChange={setEquipment}
          options={equipmentSelect} />
        <LevelSelect label="Mídia" value={videoOnly ? "video" : "all"} onChange={(value) => setVideoOnly(value === "video")}
          options={[{ value: "all", label: "Toda mídia" }, { value: "video", label: "Com vídeo nativo" }]} />
      </div>
      {hasFilters ? <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant pt-3">
        <p className="text-xs text-on-surface-variant">Filtros ativos · {items.length.toLocaleString("pt-BR")} exibidos</p>
        <button type="button" onClick={clearFilters}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-outline px-2.5 text-xs font-semibold text-on-surface hover:bg-surface-container-high">
          <RotateCcw className="size-3.5" />Limpar filtros
        </button>
      </div> : null}
    </div>
    {error ? <p role="status" className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-on-surface">{error}</p> : null}
    <div className={compact ? "grid max-h-[28rem] gap-3 overflow-y-auto pr-1 sm:grid-cols-2" : "grid gap-4 md:grid-cols-2"}>
      {items.map((item) => {
        const key = item.id ?? "local-" + item.name
        const Symbol = icons[item.modality]
        const isOpen = expanded === key
        const nativeVideo = Boolean(item.video?.url)
        return <article key={key}
          className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-outline bg-surface-container-low transition-colors hover:border-primary/45">
          <div className="relative aspect-[16/9] overflow-hidden border-b border-outline-variant bg-[#eef3f3]">
            {item.imageUrl
              ? <img src={item.imageUrl} alt={"Referência visual de " + item.name} loading="lazy"
                  className="h-full w-full object-contain p-3" />
              : <div className="grid h-full place-items-center text-[#43515a]">
                  <div className="text-center"><Symbol className="mx-auto size-8" strokeWidth={1.5} />
                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-[.12em]">Sem imagem de referência</p></div>
                </div>}
            {nativeVideo ? <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#08100f]/85 px-2 py-1 text-[9px] font-bold text-[#8ff8ed] shadow-sm">
              <Play className="size-3" /> VÍDEO
            </span> : null}
          </div>
          <div className="flex flex-1 flex-col p-4">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                <Symbol className="size-5" strokeWidth={1.7} />
              </span>
              <div className="min-w-0 flex-1">
                <h4 className="text-base font-semibold leading-5 text-on-surface">{item.name}</h4>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">{item.group}</span>
                  <span className="rounded-md border border-outline-variant bg-surface-container-high px-2 py-1 text-[10px] font-medium text-on-surface-variant">{item.equipment}</span>
                  {item.language === "fallback" ? <span className="rounded-md bg-warning/10 px-2 py-1 text-[10px] font-semibold text-warning">Idioma original</span> : null}
                </div>
              </div>
            </div>
            <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-on-surface-variant">{item.cue}</p>
            {isOpen ? <div className="mt-3 space-y-2 rounded-lg border border-outline bg-surface-container p-3 text-xs leading-5">
              <p className="whitespace-pre-line text-on-surface">{item.instructions || "Sem instruções detalhadas nesta fonte."}</p>
              {item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-primary">
                Fonte do exercício <ExternalLink className="size-3" /></a> : null}
              {item.license ? <p className="text-[10px] text-on-surface-variant">Conteúdo: {item.license}{item.author ? " · " + item.author : ""}</p> : null}
              {item.imageUrl && item.imageLicense ? <p className="text-[10px] text-on-surface-variant">Imagem: {item.imageLicense}{item.imageAuthor ? " · " + item.imageAuthor : ""}</p> : null}
              {item.video?.license ? <p className="text-[10px] text-on-surface-variant">Vídeo: {item.video.license}{item.video.author ? " · " + item.video.author : ""}</p> : null}
            </div> : null}
            <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-outline-variant pt-3">
              <button type="button" onClick={() => setExpanded(isOpen ? null : key)}
                className="min-h-9 rounded-lg border border-outline bg-surface-container px-3 text-xs font-semibold text-on-surface hover:bg-surface-container-high">
                {isOpen ? "Ocultar detalhes" : "Como executar"}
              </button>
              {nativeVideo ? <button type="button" onClick={() => setVideoExercise(item)}
                aria-label={"Assistir vídeo de " + item.name}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-primary/35 bg-primary/5 px-3 text-xs font-semibold text-primary hover:bg-primary/10">
                <Play className="size-3.5" />Assistir vídeo</button> : null}
              {onSelect ? <button type="button"
                className="ml-auto inline-flex min-h-9 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-semibold text-on-primary hover:opacity-90"
                onClick={() => onSelect(item)}><Plus className="size-3.5" />Adicionar</button> : null}
            </div>
          </div>
        </article>
      })}
      {!loading && !items.length ? <p className="col-span-full py-8 text-center text-xs text-muted">Nenhum exercício encontrado com estes filtros.</p> : null}
    </div>
    {loading ? <p role="status" className="flex items-center justify-center gap-2 py-5 text-xs text-muted"><LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />Carregando biblioteca…</p> : null}
    {!loading && items.length < total ? <div className="flex justify-center"><button type="button" disabled={loadingMore} onClick={() => void loadMore()}
      className="min-h-10 rounded-lg border border-primary/25 px-4 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-50">{loadingMore ? "Carregando…" : "Carregar mais"}</button></div> : null}
    {attribution ? <p className="text-center text-[10px] text-muted">{attribution}</p> : null}
    {!window.CSRF_TOKEN && EXERCISE_CATALOG.length ? <p className="text-center text-[10px] text-muted">Catálogo local limitado disponível fora de sessão autenticada.</p> : null}
    <TrainingVideoModal exercise={videoExercise} open={Boolean(videoExercise)} onClose={() => setVideoExercise(null)} />
  </section>
}
