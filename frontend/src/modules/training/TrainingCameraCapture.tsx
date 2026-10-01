import * as Dialog from "@radix-ui/react-dialog"
import { CircleAlert, RotateCcw, ScanSearch, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "../../components/ui/button"
import { videoToTrainingImage } from "./trainingCameraImage"

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: (dataUrl: string) => void
}

const preferredVideo: MediaTrackConstraints = {
  facingMode: { ideal: "environment" },
  width: { ideal: 1920 },
  height: { ideal: 1440 },
  aspectRatio: { ideal: 4 / 3 },
}

async function requestCamera(): Promise<MediaStream> {
  const attempts: MediaStreamConstraints[] = [
    { video: { ...preferredVideo, facingMode: { exact: "environment" } }, audio: false },
    { video: preferredVideo, audio: false },
    { video: true, audio: false },
  ]
  let lastError: unknown = null
  for (const constraints of attempts) {
    try { return await navigator.mediaDevices.getUserMedia(constraints) }
    catch (cause) { lastError = cause }
  }
  throw lastError ?? new Error("camera_unavailable")
}

export function TrainingCameraCapture({ open, onClose, onConfirm }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")
  const [preview, setPreview] = useState("")
  const [resolution, setResolution] = useState("")

  const stop = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setReady(false)
  }

  const attachStream = async (stream: MediaStream) => {
    streamRef.current = stream
    const track = stream.getVideoTracks()[0]
    try {
      const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & { focusMode?: string[] }
      if (capabilities?.focusMode?.includes("continuous")) {
        await track.applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] })
      }
    } catch { /* foco contínuo é opcional */ }
    if (videoRef.current) {
      videoRef.current.srcObject = stream
      await videoRef.current.play().catch(() => undefined)
    }
    const settings = track.getSettings()
    if (settings.width && settings.height) {
      setResolution(String(settings.width) + "×" + String(settings.height))
    }
  }

  useEffect(() => {
    if (!open) {
      stop()
      setPreview("")
      setError("")
      setResolution("")
      return
    }
    if (preview) {
      stop()
      return
    }
    let cancelled = false
    setPreview("")
    setError("")
    setReady(false)
    setResolution("")
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Este navegador não permite abrir a câmera diretamente.")
      return
    }
    void requestCamera()
      .then(async (stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        await attachStream(stream)
      })
      .catch(() => setError("Não foi possível acessar a câmera. Confira a permissão do navegador."))
    return () => {
      cancelled = true
      stop()
    }
  }, [open, preview])

  useEffect(() => () => stop(), [])

  const capture = () => {
    try {
      const video = videoRef.current
      if (!video) throw new Error("A câmera ainda não está pronta.")
      setPreview(videoToTrainingImage(video))
      stop()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível capturar a foto.")
    }
  }

  const retake = () => {
    setError("")
    setReady(false)
    setResolution("")
    setPreview("")
  }

  return <Dialog.Root open={open} onOpenChange={(value) => { if (!value) onClose() }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[140] bg-black" />
      <Dialog.Content
        className="fixed inset-0 z-[141] h-[100dvh] w-screen overflow-hidden bg-black text-white focus:outline-none"
        aria-describedby="training-camera-description">
        <Dialog.Title className="sr-only">Fotografar aparelho</Dialog.Title>
        <Dialog.Description id="training-camera-description" className="sr-only">
          Câmera em tela cheia para fotografar um aparelho de academia.
        </Dialog.Description>

        {preview
          ? <img src={preview} alt="Foto capturada para identificação"
              className="absolute inset-0 h-full w-full bg-black object-contain" />
          : <video ref={videoRef} muted playsInline
              onLoadedMetadata={() => setReady(true)}
              className="absolute inset-0 h-full w-full bg-black object-cover" />}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/72" />
        <div className="pointer-events-none absolute inset-[16%_8%_24%] rounded-3xl border border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,.16)] sm:inset-[12%_16%_22%]" />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 sm:p-5"
          style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
          <div className="rounded-xl bg-black/55 px-3 py-2 backdrop-blur">
            <p className="flex items-center gap-2 text-xs font-bold">
              <ScanSearch className="size-4 text-primary" />Identificação de aparelho
            </p>
            <p className="mt-1 max-w-sm text-[11px] leading-4 text-white/75">
              Enquadre o aparelho inteiro, com boa luz e sem cortar a estrutura.
            </p>
            {resolution ? <p className="mt-1 text-[10px] text-white/55">Câmera {resolution}</p> : null}
          </div>
          <Dialog.Close asChild>
            <button type="button" aria-label="Fechar câmera"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-black/60 text-white backdrop-blur">
              <X className="size-5" />
            </button>
          </Dialog.Close>
        </div>

        {!ready && !preview && !error ? <div className="absolute inset-0 grid place-items-center text-sm text-white/75">
          Abrindo câmera…
        </div> : null}
        {error ? <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 rounded-xl border border-warning/35 bg-black/80 p-4 text-center backdrop-blur">
          <CircleAlert className="mx-auto size-6 text-warning" />
          <p className="mt-2 text-sm font-semibold">Não foi possível abrir a câmera</p>
          <p className="mt-1 text-xs leading-5 text-white/70">{error}</p>
          <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={onClose}>Voltar</Button>
        </div> : null}

        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-5"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
          <div className="mx-auto flex max-w-xl items-center justify-center gap-3 rounded-2xl bg-black/55 p-3 backdrop-blur">
            {preview ? <>
              <Button type="button" variant="secondary" size="md" onClick={retake}>
                <RotateCcw className="size-4" />Tirar novamente
              </Button>
              <Button type="button" size="md" onClick={() => { onConfirm(preview); onClose() }}>
                <ScanSearch className="size-4" />Identificar aparelho
              </Button>
            </> : <button type="button" disabled={!ready || Boolean(error)} onClick={capture}
              aria-label="Capturar foto do aparelho"
              className="grid size-16 place-items-center rounded-full border-4 border-white bg-white/20 transition-transform active:scale-95 disabled:opacity-35 sm:size-20">
              <span className="size-11 rounded-full bg-white sm:size-14" />
            </button>}
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
