import type { LibraryExercise, MuscleGroup } from "./exerciseCatalog"

export interface TrainingLibraryResponse {
  ok: boolean
  items: LibraryExercise[]
  total: number
  offset: number
  equipmentOptions: string[]
  attribution: string
}

interface RawExercise {
  id: string
  name: string
  language: "pt" | "fallback"
  group: MuscleGroup
  modality: LibraryExercise["modality"]
  equipment: string[]
  instructions: string
  imageUrl?: string | null
  imageLicense?: string
  imageLicenseUrl?: string
  imageAuthor?: string
  video?: { url: string; durationSec?: number; author?: string; license?: string; licenseUrl?: string } | null
  steps?: string[]
  motionFrames?: string[]
  source: "wger" | "free-exercise-db" | "repdb"
  sourceUrl: string
  license?: string
  licenseUrl?: string
  author?: string
}
export function normalizeLibraryExercise(raw: RawExercise): LibraryExercise {
  const instructions = raw.instructions.trim()
  const cueSource = instructions.replace(/^\s*(?:\d+[.)]|[-•])\s*/u, "")
  const firstSentence = cueSource.split(/(?<=[.!?])\s+/)[0]?.trim() ?? ""
  const cue = firstSentence.length >= 6
    ? firstSentence.slice(0, 180)
    : "Abra os detalhes para conferir a execução e os ajustes do movimento."
  return {
    id: raw.id,
    name: raw.name.trim(),
    language: raw.language,
    group: raw.group,
    modality: raw.modality,
    equipmentList: raw.equipment,
    equipment: raw.equipment.length ? raw.equipment.join(" / ") : "Equipamento não informado",
    instructions,
    cue: instructions ? cue : "Confira a execução antes de iniciar.",
    imageUrl: raw.imageUrl ?? null,
    imageLicense: raw.imageLicense ?? "",
    imageLicenseUrl: raw.imageLicenseUrl ?? "",
    imageAuthor: raw.imageAuthor ?? "",
    video: raw.video ?? null,
    steps: Array.isArray(raw.steps) ? raw.steps.filter((step): step is string => typeof step === "string" && step.trim().length > 0) : [],
    motionFrames: Array.isArray(raw.motionFrames) ? raw.motionFrames.filter((frame): frame is string => typeof frame === "string" && frame.startsWith("https://")) : [],
    source: raw.source,
    sourceUrl: raw.sourceUrl,
    license: raw.license ?? "",
    licenseUrl: raw.licenseUrl ?? "",
    author: raw.author ?? "",
  }
}

export async function fetchTrainingLibrary(params: {
  query?: string; group?: MuscleGroup | "Todos"; equipment?: string; videoOnly?: boolean; limit?: number; offset?: number
}, signal?: AbortSignal): Promise<TrainingLibraryResponse> {
  const search = new URLSearchParams()
  if (params.query?.trim()) search.set("q", params.query.trim())
  if (params.group && params.group !== "Todos") search.set("group", params.group)
  if (params.equipment?.trim()) search.set("equipment", params.equipment.trim())
  if (params.videoOnly) search.set("video", "1")
  search.set("limit", String(Math.max(1, Math.min(60, params.limit ?? 36))))
  search.set("offset", String(Math.max(0, params.offset ?? 0)))
  const response = await fetch("/api/training-library.php?" + search.toString(), {
    credentials: "same-origin", headers: { Accept: "application/json" }, signal,
  })
  const body = await response.json().catch(() => null) as {
    items?: RawExercise[]; total?: number; offset?: number; equipmentOptions?: string[]; attribution?: string; message?: string
  } | null
  if (!response.ok || !body?.items) throw new Error(body?.message ?? "Biblioteca de exercícios indisponível.")
  return {
    ok: true,
    items: body.items.map(normalizeLibraryExercise),
    total: Number(body.total ?? body.items.length),
    offset: Number(body.offset ?? 0),
    equipmentOptions: Array.isArray(body.equipmentOptions) ? body.equipmentOptions.filter((x): x is string => typeof x === "string") : [],
    attribution: String(body.attribution ?? ""),
  }
}
