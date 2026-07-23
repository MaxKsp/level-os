import type { Identity } from "./contracts"

export function hasIdentityBackend(): boolean {
  return typeof window !== "undefined" && Boolean(window.CSRF_TOKEN)
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const body = await response.json().catch(() => null)
  if (!response.ok || !body || typeof body !== "object") {
    const message = body && typeof body === "object" && "error" in body
      ? String(body.error)
      : `Erro HTTP ${response.status}`
    throw new Error(message)
  }
  return body as Record<string, unknown>
}

export async function loadIdentity(): Promise<Identity> {
  const body = await readJson(await fetch("/api/me.php", {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  }))
  return {
    username: typeof body.username === "string" && body.username.trim() ? body.username.trim() : "Usuário",
    email: typeof body.email === "string" ? body.email : "",
    avatar: typeof body.avatar === "string" && body.avatar ? body.avatar : null,
    totp_enabled: body.totp_enabled === true,
    notify_email: body.notify_email === true,
    has_password: body.has_password === true,
    auth_provider: body.auth_provider === "supabase" ? "supabase" : null,
  }
}

export async function uploadAvatar(file: File): Promise<string> {
  const form = new FormData()
  form.append("avatar", file)
  const body = await readJson(await fetch("/api/avatar.php", {
    method: "POST",
    credentials: "same-origin",
    headers: { "X-CSRF-Token": window.CSRF_TOKEN ?? "" },
    body: form,
  }))
  if (typeof body.avatar !== "string" || !body.avatar) throw new Error("Resposta de avatar inválida.")
  return body.avatar
}
