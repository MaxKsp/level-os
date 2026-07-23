import { GoTrueClient, type Session } from "@supabase/auth-js"

declare global {
  interface Window {
    CSRF_TOKEN?: string
    LEVEL_OS_AUTH_CONFIG?: { url: string; publishableKey: string } | null
  }
}

let client: GoTrueClient | null = null

export class AuthSessionExchangeError extends Error {
  constructor(public readonly code: string, public readonly status: number) {
    super("Nao foi possivel validar sua sessao.")
    this.name = "AuthSessionExchangeError"
  }
}

export function getSupabaseClient(): GoTrueClient | null {
  const config = window.LEVEL_OS_AUTH_CONFIG
  if (!config?.url || !config.publishableKey) return null
  if (!client) {
    client = new GoTrueClient({
      url: `${config.url.replace(/\/$/, "")}/auth/v1`,
      headers: {
        apikey: config.publishableKey,
        Authorization: `Bearer ${config.publishableKey}`,
      },
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      // A pagina de callback faz a troca PKCE explicitamente. Deixar o SDK
      // detectar a URL aqui criaria uma segunda troca e perderia redirectType.
      detectSessionInUrl: false,
    })
  }
  return client
}

export async function exchangePhpSession(session: Session): Promise<"authenticated" | "mfa_required" | "supabase_mfa_required" | "link_required"> {
  const response = await fetch("/api/auth-supabase-exchange.php", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.access_token}`,
      "X-CSRF-Token": window.CSRF_TOKEN ?? "",
    },
  })
  const payload = await response.json().catch(() => ({})) as { status?: string; error?: string }
  const refreshedCsrf = response.headers.get("X-CSRF-Token")
  if (refreshedCsrf) window.CSRF_TOKEN = refreshedCsrf
  if (response.status === 409 && payload.error === "link_required") return "link_required"
  if (response.status === 403 && payload.status === "supabase_mfa_required") return "supabase_mfa_required"
  if (!response.ok) {
    throw new AuthSessionExchangeError(payload.error ?? "authentication_failed", response.status)
  }
  if (payload.status === "mfa_required") return "mfa_required"
  return "authenticated"
}

export function startSupabaseSessionBridge(): void {
  const supabase = getSupabaseClient()
  if (!supabase) return
  let lastToken = ""
  const sync = async (session: Session | null) => {
    if (!session || session.access_token === lastToken) return
    lastToken = session.access_token
    try {
      const result = await exchangePhpSession(session)
      if (result === "link_required") {
        window.location.assign("/login.php?link_required=1")
      }
    } catch {
      lastToken = ""
    }
  }
  void supabase.getSession().then(({ data }) => sync(data.session))
  supabase.onAuthStateChange((_event, session) => { void sync(session) })
}
