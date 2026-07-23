import type { ProgressEventResult, ProgressEventType, ProgressState } from "./contracts"

declare global {
  interface Window {
    CSRF_TOKEN?: string
  }
}

export function hasProgressBackend(): boolean {
  return typeof window !== "undefined" && Boolean(window.CSRF_TOKEN)
}

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body
      ? String(body.error)
      : `Erro HTTP ${response.status}`
    throw new Error(message)
  }
  return body as T
}

export async function loadProgress(): Promise<ProgressState> {
  return readJson<ProgressState>(await fetch("/api/progress.php", {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  }))
}

export async function postProgressEvent(type: ProgressEventType, ref: string): Promise<ProgressEventResult> {
  return readJson<ProgressEventResult>(await fetch("/api/progress-event.php", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-CSRF-Token": window.CSRF_TOKEN ?? "",
    },
    body: JSON.stringify({ type, ref }),
  }))
}
