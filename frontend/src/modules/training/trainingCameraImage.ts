const MAX_DATA_URL_LENGTH = 2_300_000
const MAX_DIMENSION = 1800

function encodeCanvas(canvas: HTMLCanvasElement): string {
  for (const quality of [0.9, 0.84, 0.78, 0.72, 0.66]) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality)
    if (dataUrl.length <= MAX_DATA_URL_LENGTH) return dataUrl
  }
  throw new Error("A foto ficou grande demais. Aproxime o aparelho e tente novamente.")
}

export function canvasToTrainingImage(canvas: HTMLCanvasElement): string {
  if (canvas.width < 120 || canvas.height < 120) throw new Error("A imagem ficou pequena demais.")
  return encodeCanvas(canvas)
}

export async function blobToTrainingImage(source: Blob): Promise<string> {
  const bitmap = await createImageBitmap(source)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext("2d", { alpha: false })
  if (!context) {
    bitmap.close()
    throw new Error("Seu navegador não conseguiu preparar a foto.")
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvasToTrainingImage(canvas)
}

export function videoToTrainingImage(video: HTMLVideoElement): string {
  if (video.videoWidth < 120 || video.videoHeight < 120) throw new Error("A câmera ainda não está pronta.")
  const scale = Math.min(1, MAX_DIMENSION / Math.max(video.videoWidth, video.videoHeight))
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
  const context = canvas.getContext("2d", { alpha: false })
  if (!context) throw new Error("Não foi possível capturar a câmera.")
  context.drawImage(video, 0, 0, canvas.width, canvas.height)
  return canvasToTrainingImage(canvas)
}
