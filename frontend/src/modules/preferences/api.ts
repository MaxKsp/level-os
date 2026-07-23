import type { ThemeMode } from "../../lib/theme"

export interface NotificationPreferences {
  tasks: boolean
  finance: boolean
  backup: boolean
}

export interface Preferences {
  theme: ThemeMode
  notifications: NotificationPreferences
  notify_email: boolean
  onboarding_completed: boolean
}

async function parse(response: Response): Promise<Preferences> {
  const body = await response.json().catch(() => null) as Record<string, unknown> | null
  if (!response.ok || !body) throw new Error(body && "error" in body ? String(body.error) : `Erro HTTP ${response.status}`)
  const notifications = body.notifications as Record<string, unknown> | undefined
  return {
    theme: body.theme === "light" ? "light" : "dark",
    notifications: {
      tasks: notifications?.tasks !== false,
      finance: notifications?.finance !== false,
      backup: notifications?.backup !== false,
    },
    notify_email: body.notify_email === true,
    onboarding_completed: body.onboarding_completed === true,
  }
}

export async function loadPreferences(): Promise<Preferences> {
  return parse(await fetch("/api/prefs.php", { credentials: "same-origin", headers: { Accept: "application/json" } }))
}

export async function savePreferences(value: Preferences): Promise<Preferences> {
  return parse(await fetch("/api/prefs.php", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": window.CSRF_TOKEN ?? "" },
    body: JSON.stringify(value),
  }))
}
