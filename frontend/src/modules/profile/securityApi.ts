interface Enrollment {
  secret: string
  otpauth_uri: string
}

async function request(path: string, body?: Record<string, string>): Promise<Record<string, unknown>> {
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-CSRF-Token": window.CSRF_TOKEN ?? "",
    },
    body: body ? JSON.stringify(body) : "{}",
  })
  const data = await response.json().catch(() => null) as Record<string, unknown> | null
  if (!response.ok || !data) throw new Error(data && "error" in data ? String(data.error) : `Erro HTTP ${response.status}`)
  return data
}

export async function enrollTotp(): Promise<Enrollment> {
  const data = await request("/api/totp-enroll.php")
  if (typeof data.secret !== "string" || typeof data.otpauth_uri !== "string") throw new Error("Resposta de 2FA inválida.")
  return { secret: data.secret, otpauth_uri: data.otpauth_uri }
}

export async function confirmTotp(code: string): Promise<string[]> {
  const data = await request("/api/totp-confirm.php", { code })
  return Array.isArray(data.backup_codes) ? data.backup_codes.filter((item): item is string => typeof item === "string") : []
}

export async function disableTotp(password: string): Promise<void> {
  await request("/api/totp-disable.php", { password })
}
