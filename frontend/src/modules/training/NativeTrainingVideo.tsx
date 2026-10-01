import { useEffect, useRef, useState } from "react"
import { CircleAlert, Play, Video } from "lucide-react"
import { Modal } from "../../components/ui/Modal"
import type { LibraryExercise } from "./exerciseCatalog"

type Props = {
  exercise: LibraryExercise
  compact?: boolean
  autoPlay?: boolean
}

export function NativeTrainingVideo({ exercise, compact = false, autoPlay = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [failed, setFailed] = useState(false)
  const source = exercise.video?.url ?? ""

  useEffect(() => {
    setFailed(false)
    if (autoPlay && source) void videoRef.current?.play().catch(() => undefined)
  }, [source, autoPlay])

  if (!source) return <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container/35 p-4 text-center">
    <Video className="mx-auto size-5 text-muted" />
    <p className="mt-2 text-xs font-semibold text-on-surface">Vídeo nativo indisponível nesta referência</p>
    <p className="mt-1 text-[10px] leading-4 text-muted">O Level OS exibe apenas vídeos diretos com licença e autoria informadas pela base.</p>
  </div>

  return <div className="overflow-hidden rounded-xl border border-outline-variant bg-black">    <div className="relative aspect-video">
      <video ref={videoRef} src={source} poster={exercise.imageUrl ?? undefined} controls playsInline
        preload="metadata" onError={() => setFailed(true)}
        className="h-full w-full bg-black object-contain" aria-label={"Vídeo de execução de " + exercise.name} />
      {!failed ? <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/65 px-2 py-1 text-[9px] font-bold tracking-wide text-white backdrop-blur">
        PLAYER LEVEL OS
      </span> : null}
      {failed ? <div className="absolute inset-0 grid place-items-center bg-black/85 p-5 text-center text-white">
        <div><CircleAlert className="mx-auto size-6" /><p className="mt-2 text-xs font-semibold">Não foi possível reproduzir este vídeo.</p></div>
      </div> : null}
    </div>
    <div className={compact ? "px-3 py-2" : "px-4 py-3"}>
      <p className="truncate text-xs font-semibold text-white">{exercise.name}</p>
      <p className="mt-1 text-[10px] text-white/65">
        {exercise.video?.durationSec ? Math.round(exercise.video.durationSec) + " s · " : ""}
        {exercise.video?.license || "Licença informada pela fonte"}
        {exercise.video?.author ? " · " + exercise.video.author : ""}
      </p>
    </div>
  </div>
}

export function TrainingVideoModal({ exercise, open, onClose }: {
  exercise: LibraryExercise | null; open: boolean; onClose: () => void
}) {  return <Modal isOpen={open} onClose={onClose}
    title={exercise ? "Execução · " + exercise.name : "Vídeo de execução"}
    description="Vídeo reproduzido dentro do Level OS, sem redirecionar para outra plataforma."
    icon="play_circle" maxWidth="max-w-4xl">
    {exercise ? <div className="space-y-4">
      <NativeTrainingVideo exercise={exercise} autoPlay />
      <div className="grid gap-3 rounded-xl border border-outline-variant bg-surface-container/45 p-4 sm:grid-cols-[1fr_auto]">
        <div><p className="text-xs font-semibold text-on-surface">{exercise.group} · {exercise.equipment}</p>
          <p className="mt-1 text-xs leading-5 text-muted">{exercise.instructions || exercise.cue}</p></div>
        <span className="inline-flex h-fit items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-[10px] font-bold text-primary">
          <Play className="size-3" /> VÍDEO NATIVO
        </span>
      </div>
    </div> : null}
  </Modal>
}
