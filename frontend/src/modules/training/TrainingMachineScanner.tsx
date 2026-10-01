import { useEffect, useRef, useState } from "react"
import { Camera, CircleAlert, ExternalLink, ImagePlus, LoaderCircle, Play, ScanSearch, ShieldCheck } from "lucide-react"
import { Button } from "../../components/ui/button"
import { LevelStepList, type LevelStepStatus } from "../../components/ui/LevelStepList"
import { LevelSelect } from "../../components/ui/LevelSelect"
import { SectionCard } from "../../design-system"
import { fetchTrainingLibrary } from "./trainingKnowledge"
import { NativeTrainingVideo, TrainingVideoModal } from "./NativeTrainingVideo"
import { TrainingCameraCapture } from "./TrainingCameraCapture"
import { blobToTrainingImage } from "./trainingCameraImage"
import type { LibraryExercise } from "./exerciseCatalog"

type MachineProfile = {
  id: string
  name: string
  query: string
  equipment: string
  tips: string[]
}
type Recognition = {
  recognized: boolean
  machine: MachineProfile | null
  confidence: number
  alternatives: MachineProfile[]
  catalog?: MachineProfile[]
  imageQuality?: "good" | "poor"
  evidence?: string[]
  retakeReason?: string
  notice: string
}
async function recognizeMachine(imageDataUrl: string): Promise<Recognition> {
  const response = await fetch("/api/training-machine-recognition.php", {
    method: "POST", credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": window.CSRF_TOKEN ?? "" },
    body: JSON.stringify({ imageDataUrl }),
  })
  const body = await response.json().catch(() => null) as (Recognition & { message?: string }) | null
  if (!response.ok || !body) throw new Error(body?.message ?? "Não foi possível reconhecer o aparelho.")
  return body
}
export function TrainingMachineScanner() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [recognition, setRecognition] = useState<Recognition | null>(null)
  const [selected, setSelected] = useState<MachineProfile | null>(null)
  const [related, setRelated] = useState<LibraryExercise[]>([])
  const [relatedLoading, setRelatedLoading] = useState(false)
  const [preview, setPreview] = useState("")
  const [error, setError] = useState("")
  const [videoExercise, setVideoExercise] = useState<LibraryExercise | null>(null)

  useEffect(() => {
    if (!selected) { setRelated([]); return }
    let active = true
    setRelatedLoading(true)
    const load = async () => {
      const data = await fetchTrainingLibrary({ query: selected.query, limit: 24 })
      return data.items
    }
    void load()
      .then((items) => {
        if (!active) return
        setRelated([...items].sort((a, b) => Number(Boolean(b.video?.url)) - Number(Boolean(a.video?.url))))
      })
      .catch(() => { if (active) setRelated([]) })
      .finally(() => { if (active) setRelatedLoading(false) })
    return () => { active = false }
  }, [selected?.id])

  const analyze = async (dataUrl: string) => {
    setAnalyzing(true); setError(""); setRecognition(null); setSelected(null); setRelated([])
    setPreview(dataUrl)
    try {
      const result = await recognizeMachine(dataUrl)
      setRecognition(result)
      // Só seleciona automaticamente quando a foto está boa e a classificação é realmente forte.
      setSelected(result.recognized && result.imageQuality !== "poor" && result.machine && result.confidence >= 0.82 ? result.machine : null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível analisar a foto.")
    } finally { setAnalyzing(false) }
  }
  const useFile = async (file?: File) => {
    if (!file) return
    if (!["image/jpeg","image/png","image/webp"].includes(file.type)) { setError("Use uma foto JPEG, PNG ou WebP."); return }
    if (file.size > 12_000_000) { setError("A foto original deve ter no máximo 12 MB."); return }
    try { await analyze(await blobToTrainingImage(file)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível preparar a foto.") }
  }
  const confidence = recognition ? Math.round(recognition.confidence * 100) : 0
  const candidates = recognition ? [recognition.machine, ...recognition.alternatives]
    .filter((item): item is MachineProfile => Boolean(item))
    .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index) : []
  const supportedMachines = recognition?.catalog?.length ? recognition.catalog : candidates
  const featuredExercise = related.find((exercise) => Boolean(exercise.video?.url)) ?? related[0] ?? null
  const captureDone = Boolean(preview || analyzing || recognition)
  const identifyDone = Boolean(selected)
  const identifyStatus: LevelStepStatus = identifyDone ? "complete" : captureDone ? "active" : "pending"
  const playbackStatus: LevelStepStatus = selected ? "active" : "pending"

  return <SectionCard title="Reconhecer aparelho" description="Tire uma foto, confira o aparelho identificado e veja a execução dentro do Level OS."
    icon={<ScanSearch className="size-5 text-primary" />}>
    <LevelStepList ariaLabel="Etapas do reconhecimento de aparelho" className="mb-4" items={[
      {
        id: "capture",
        title: "Fotografe o aparelho",
        description: "Centralize a máquina e evite enquadrar pessoas.",
        icon: <Camera className="size-4" />,
        status: captureDone ? "complete" : "active",
      },
      {
        id: "identify",
        title: "Confirme a identificação",
        description: analyzing ? "Analisando a imagem e comparando com os aparelhos suportados." : "Confira o aparelho sugerido e ajuste manualmente se necessário.",
        icon: <ScanSearch className="size-4" />,
        status: identifyStatus,
      },
      {
        id: "playback",
        title: "Veja a execução",
        description: "O Level OS abre um tutorial visual com execução e instruções em etapas.",
        icon: <Play className="size-4" />,
        status: playbackStatus,
      },
    ]} />
    <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
      <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setCameraOpen(true)}><Camera className="size-4" />Abrir câmera</Button>
          <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}><ImagePlus className="size-4" />Enviar foto</Button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment"
            className="hidden" onChange={(event) => { void useFile(event.target.files?.[0]); event.currentTarget.value = "" }} />
        </div>
        <p className="mt-3 text-[11px] leading-5 text-muted">Ao analisar, a imagem é reduzida no navegador e enviada ao provedor de IA configurado somente para identificar o aparelho. O Level OS não salva a foto neste fluxo.</p>
        {preview ? <img src={preview} alt="Foto analisada do aparelho" className="mt-4 aspect-[16/10] w-full rounded-xl border border-outline-variant object-contain" /> : null}
        {analyzing ? <p role="status" className="mt-4 flex items-center gap-2 rounded-lg bg-primary/10 p-3 text-xs text-on-surface">
          <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />Identificando o aparelho…</p> : null}
        {error ? <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-error/35 bg-error/5 p-3 text-xs text-error">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />{error}</p> : null}
        {recognition ? <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-2"><strong className="text-sm text-on-surface">Confiança visual</strong>
            <span className="text-sm font-semibold tabular-nums text-primary">{confidence}%</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-outline-variant"><div className="h-full rounded-full bg-primary" style={{ width: confidence + "%" }} /></div>
          <p className={recognition.imageQuality === "poor" || recognition.confidence < 0.82 ? "text-xs text-warning" : "text-xs text-on-surface-variant"}>
            {recognition.imageQuality === "poor"
              ? recognition.retakeReason || "A foto não ficou clara o suficiente. Refaça o enquadramento para aumentar a precisão."
              : recognition.recognized && recognition.confidence >= 0.82
                ? "Aparelho selecionado automaticamente. Confira os detalhes abaixo antes de seguir."
                : "A classificação ainda tem dúvida. Escolha uma opção sugerida ou refaça a foto."}
          </p>
          {recognition.evidence?.length ? <div className="rounded-lg border border-outline-variant bg-surface-container p-3">
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-on-surface-variant">O que a IA enxergou</p>
            <ul className="mt-2 space-y-1">{recognition.evidence.map((item) => <li key={item} className="text-[11px] leading-4 text-on-surface-variant">• {item}</li>)}</ul>
          </div> : null}
          {recognition.imageQuality === "poor" ? <Button type="button" variant="secondary" size="sm" onClick={() => setCameraOpen(true)}>
            <Camera className="size-4" />Refazer foto
          </Button> : null}
          <div className="flex flex-wrap gap-2">{candidates.map((machine) => <button type="button" key={machine.id}
            onClick={() => setSelected(machine)} aria-pressed={selected?.id === machine.id}
            className={"min-h-10 rounded-lg border px-3 text-xs font-semibold " + (selected?.id === machine.id ? "border-primary bg-primary/10 text-primary" : "border-outline-variant text-on-surface")}>{machine.name}</button>)}</div>
          {supportedMachines.length ? <div className="pt-1"><LevelSelect
            label="Selecionar manualmente entre aparelhos suportados"
            value={selected?.id ?? ""}
            onChange={(id) => setSelected(supportedMachines.find((machine) => machine.id === id) ?? null)}
            options={[{ value: "", label: "Escolher aparelho" }, ...supportedMachines.map((machine) => ({ value: machine.id, label: machine.name }))]}
          /></div> : null}
        </div> : null}
      </div>
      <div className="min-w-0">
        {selected ? <div className="space-y-4">
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">Classificação do aparelho</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-on-surface">{selected.name}</h3>
              {featuredExercise ? <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">TUTORIAL SELECIONADO</span> : null}
            </div>
            <p className="mt-1 text-xs text-muted">{featuredExercise ? "O Level OS encontrou uma execução compatível e já preparou o tutorial passo a passo." : relatedLoading ? "Buscando a melhor execução para este aparelho…" : "Não encontrei uma correspondência segura para este aparelho; veja as referências relacionadas abaixo."}</p>
          </div>
          {featuredExercise ? <NativeTrainingVideo exercise={featuredExercise} autoPlay /> : null}
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
            <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /><h3 className="font-semibold text-on-surface">Boas práticas antes de usar</h3></div>
            <p className="mt-1 text-xs text-muted">Ajustes gerais para conferir no {selected.name}:</p>
            <ul className="mt-3 space-y-2">{selected.tips.map((tip) => <li key={tip} className="flex gap-2 text-xs leading-5 text-on-surface-variant">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />{tip}</li>)}</ul>
            <p className="mt-3 text-[10px] leading-4 text-muted">Confira também os adesivos e regulagens do fabricante. Interrompa se houver dor ou sensação de instabilidade.</p>
          </div>
          <div><div className="flex items-end justify-between gap-2"><div><h3 className="text-sm font-semibold text-on-surface">Exercícios relacionados</h3>
            <p className="mt-1 text-[11px] text-muted">Conteúdo da biblioteca para confirmar o movimento e o equipamento.</p></div></div>
            {relatedLoading ? <p role="status" className="mt-3 text-xs text-muted">Buscando conteúdo…</p> :
              related.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{related.slice(0, 6).map((exercise) => {
                return <article key={exercise.id ?? exercise.name} className={"rounded-lg border bg-surface-container/60 p-3 " + (featuredExercise?.id === exercise.id ? "border-primary/40" : "border-outline-variant")}>
                  <div className="flex gap-3">{exercise.imageUrl ? <img src={exercise.imageUrl} alt="" className="size-16 shrink-0 rounded-lg object-contain" /> : null}
                    <div className="min-w-0"><strong className="text-xs text-on-surface">{exercise.name}</strong><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-muted">{exercise.cue}</p></div></div>
                  <div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => setVideoExercise(exercise)}
                    className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-primary/25 px-2 text-[10px] font-semibold text-primary">
                    <Play className="size-3" />Ver passo a passo</button>
                    {exercise.sourceUrl ? <a href={exercise.sourceUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex min-h-9 items-center gap-1 px-2 text-[10px] text-muted">Fonte <ExternalLink className="size-3" /></a> : null}</div>
                </article>
              })}</div> : <p className="mt-3 rounded-lg border border-outline-variant p-3 text-xs text-muted">Não encontrei correspondência licenciada na base para esta máquina. Use a busca da biblioteca.</p>}
          </div>
        </div> : <div className="grid min-h-52 place-items-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low/45 p-6 text-center">
          <div><ScanSearch className="mx-auto size-7 text-primary" /><p className="mt-3 text-sm font-semibold text-on-surface">Tire uma foto para começar</p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-muted">Com boa confiança, o Level OS seleciona o aparelho automaticamente. Você pode corrigir a identificação antes de seguir.</p></div></div>}
      </div>
    </div>
    <TrainingCameraCapture open={cameraOpen} onClose={() => setCameraOpen(false)}
      onConfirm={(dataUrl) => { void analyze(dataUrl) }} />
    <TrainingVideoModal exercise={videoExercise} open={Boolean(videoExercise)} onClose={() => setVideoExercise(null)} />
  </SectionCard>
}
