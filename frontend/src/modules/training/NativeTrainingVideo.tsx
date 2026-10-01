import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { CircleAlert, Pause, Play, RotateCcw, SkipBack, SkipForward, Video } from "lucide-react"
import { Modal } from "../../components/ui/Modal"
import type { LibraryExercise } from "./exerciseCatalog"

type Props = {
  exercise: LibraryExercise
  compact?: boolean
  autoPlay?: boolean
}

function tutorialSteps(exercise: LibraryExercise) {
  if (exercise.steps?.length) return exercise.steps
  const text = (exercise.instructions || exercise.cue).trim()
  return text.split(/(?<=[.!?])\s+/).map((step) => step.trim()).filter((step) => step.length >= 12).slice(0, 8)
}

function tutorialFrames(exercise: LibraryExercise) {
  const frames = (exercise.motionFrames ?? []).filter(Boolean)
  if (frames.length) return frames
  return exercise.imageUrl ? [exercise.imageUrl] : []
}

export function NativeTrainingVideo({ exercise, compact = false, autoPlay = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const steps = useMemo(() => tutorialSteps(exercise), [exercise])
  const frames = useMemo(() => tutorialFrames(exercise), [exercise])
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(autoPlay)
  const [failed, setFailed] = useState(false)
  const youtubeId = exercise.video?.provider === "youtube" ? exercise.video.youtubeId ?? "" : ""
  const directVideo = youtubeId ? "" : exercise.video?.url ?? ""

  useEffect(() => {
    setStep(0); setPlaying(autoPlay); setFailed(false)
    if (autoPlay && directVideo) void videoRef.current?.play().catch(() => undefined)
  }, [exercise.id, directVideo, youtubeId, autoPlay])

  useEffect(() => {
    if (!playing || directVideo || youtubeId || steps.length <= 1) return
    const timer = window.setInterval(() => {
      setStep((current) => current >= steps.length - 1 ? 0 : current + 1)
    }, 4200)
    return () => window.clearInterval(timer)
  }, [playing, directVideo, youtubeId, steps.length])

  const currentFrame = frames.length ? frames[step % frames.length] : ""
  const progress = steps.length ? ((step + 1) / steps.length) * 100 : 0
  const startSeconds = Math.max(0, exercise.video?.startSeconds ?? 0)
  const youtubeSrc = youtubeId
    ? `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&playsinline=1&modestbranding=1${startSeconds ? `&start=${startSeconds}` : ""}${autoPlay ? "&autoplay=1" : ""}`
    : ""

  return <div className={compact ? "space-y-3" : "grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,.75fr)]"}>
    <div className="min-w-0">
      {youtubeSrc ? <div className="overflow-hidden rounded-xl border border-outline bg-black">
        <div className="relative aspect-video">
          <iframe src={youtubeSrc} title={"Vídeo explicativo de " + exercise.name}
            loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen referrerPolicy="strict-origin-when-cross-origin"
            className="h-full w-full border-0" />
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/75 px-2 py-1 text-[9px] font-bold tracking-wide text-white">
            VÍDEO EXPLICATIVO
          </span>
        </div>
      </div> : directVideo ? <div className="overflow-hidden rounded-xl border border-outline bg-black">
        <div className="relative aspect-video">
          <video ref={videoRef} src={directVideo} poster={exercise.imageUrl ?? undefined} controls playsInline
            preload="metadata" onError={() => setFailed(true)}
            className="h-full w-full bg-black object-contain" aria-label={"Vídeo de execução de " + exercise.name} />
          {!failed ? <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/70 px-2 py-1 text-[9px] font-bold tracking-wide text-white">
            VÍDEO LEVEL OS
          </span> : null}
          {failed ? <PlayerError /> : null}
        </div>
      </div> : <GuidedVisualPlayer exercise={exercise} frame={currentFrame} step={step} steps={steps}
        playing={playing} progress={progress} onPlaying={setPlaying} onStep={setStep} />}
    </div>

    <div className={compact ? "rounded-xl border border-outline-variant bg-surface-container p-3" :
      "min-w-0 rounded-xl border border-outline-variant bg-surface-container-low p-3 sm:p-4"}>
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-primary">Passo a passo</p>
          <h3 className="mt-1 text-sm font-semibold text-on-surface">{exercise.name}</h3></div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
          {steps.length || 1} ETAPAS
        </span>
      </div>
      <ol className={compact ? "mt-3 space-y-2" : "mt-3 max-h-[24rem] space-y-2 overflow-y-auto pr-1"}>
        {steps.length ? steps.map((item, index) => <li key={index}>
          <button type="button" onClick={() => { setStep(index); if (!directVideo && !youtubeId) setPlaying(false) }}
            className={"flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors " +
              (index === step ? "border-primary/40 bg-primary/8" : "border-outline-variant bg-surface hover:bg-surface-container-high")}>
            <span className={"grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-bold " +
              (index === step ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant")}>{index + 1}</span>
            <span className="text-xs leading-5 text-on-surface">{item}</span>
          </button>
        </li>) : <li className="text-xs leading-5 text-on-surface-variant">{exercise.cue}</li>}
      </ol>
      {exercise.formCues?.length ? <div className="mt-4 border-t border-outline-variant pt-3">
        <p className="text-[10px] font-bold uppercase tracking-[.15em] text-primary">Pontos importantes</p>
        <ul className="mt-2 space-y-2">{exercise.formCues.slice(0, 5).map((cue) =>
          <li key={cue} className="flex gap-2 text-xs leading-5 text-on-surface-variant">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />{cue}
          </li>)}</ul>
      </div> : null}
    </div>
  </div>
}

function GuidedVisualPlayer({ exercise, frame, step, steps, playing, progress, onPlaying, onStep }: {
  exercise: LibraryExercise
  frame: string
  step: number
  steps: string[]
  playing: boolean
  progress: number
  onPlaying: (value: boolean) => void
  onStep: (value: number) => void
}) {
  const last = Math.max(0, steps.length - 1)
  return <div className="overflow-hidden rounded-xl border border-outline bg-[#0a100f] text-white">
    <div className="relative aspect-video sm:aspect-[16/9]">
      {frame ? <img src={frame} alt={"Demonstração visual de " + exercise.name}
        className="h-full w-full object-contain p-3 sm:p-5" /> :
        <div className="grid h-full place-items-center"><Video className="size-8 text-white/55" /></div>}
      <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2 py-1 text-[9px] font-bold tracking-wide text-white">
        TUTORIAL GUIADO
      </span>
      <div className="absolute inset-x-3 bottom-3 rounded-lg bg-black/78 p-3 backdrop-blur">
        <p className="text-[10px] font-bold uppercase tracking-[.13em] text-primary">Etapa {Math.min(step + 1, Math.max(1, steps.length))}</p>
        <p aria-live="polite" className="mt-1 line-clamp-3 text-xs leading-5 text-white">{steps[step] || exercise.cue}</p>
      </div>
    </div>

    <div className="border-t border-white/10 px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
      <div className="h-1.5 overflow-hidden rounded-full bg-white/15" aria-label={"Progresso " + Math.round(progress) + "%"}>
        <div className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: progress + "%" }} />
      </div>
      <div className="mt-3 grid grid-cols-[2.75rem_minmax(5rem,1fr)_2.75rem_2.75rem] items-center gap-1.5 sm:flex sm:justify-center sm:gap-2">
        <PlayerButton label="Etapa anterior" disabled={step <= 0}
          onClick={() => onStep(Math.max(0, step - 1))}><SkipBack className="size-4" /></PlayerButton>
        <button type="button" onClick={() => onPlaying(!playing)}
          className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-2 text-[11px] font-bold text-on-primary sm:min-w-28 sm:gap-2 sm:px-4 sm:text-xs">
          {playing ? <><Pause className="size-4" />Pausar</> : <><Play className="size-4" />Reproduzir</>}
        </button>
        <PlayerButton label="Próxima etapa" disabled={step >= last}
          onClick={() => onStep(Math.min(last, step + 1))}><SkipForward className="size-4" /></PlayerButton>
        <PlayerButton label="Reiniciar tutorial" onClick={() => { onStep(0); onPlaying(false) }}>
          <RotateCcw className="size-4" />
        </PlayerButton>
      </div>
    </div>
  </div>
}

function PlayerButton({ label, onClick, disabled = false, children }: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick}
    className="grid size-11 shrink-0 place-items-center rounded-lg border border-white/15 text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30">
    {children}
  </button>
}

function PlayerError() {
  return <div className="absolute inset-0 grid place-items-center bg-black/88 p-5 text-center text-white">
    <div><CircleAlert className="mx-auto size-6" />
      <p className="mt-2 text-xs font-semibold">Não foi possível reproduzir o vídeo direto.</p>
      <p className="mt-1 text-[10px] text-white/65">Use o passo a passo exibido ao lado.</p>
    </div>
  </div>
}

export function TrainingVideoModal({ exercise, open, onClose }: {
  exercise: LibraryExercise | null
  open: boolean
  onClose: () => void
}) {
  return <Modal isOpen={open} onClose={onClose}
    title={exercise ? "Como fazer · " + exercise.name : "Tutorial do exercício"}
    description="Vídeo demonstrativo real, execução em etapas e pontos de técnica no mesmo tutorial."
    icon="play_circle" maxWidth="max-w-6xl">
    {exercise ? <NativeTrainingVideo exercise={exercise} autoPlay /> : null}
  </Modal>
}
