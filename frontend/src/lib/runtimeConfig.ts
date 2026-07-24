declare global {
  interface Window {
    CSRF_TOKEN?: string
    LEVEL_OS_USER_SCOPE?: string | null
    LEVEL_OS_AUTH_CONFIG?: { url: string; publishableKey: string } | null
    LEVEL_OS_SENTRY_DSN?: string | null
  }
}

function metaContent(name: string): string {
  return document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content ?? ""
}

export function loadRuntimeConfigFromMeta(): void {
  const csrf = metaContent("level-os-csrf")
  const userScope = metaContent("level-os-user-scope")
  const sentryDsn = metaContent("level-os-sentry-dsn")
  const authConfig = metaContent("level-os-auth-config")

  if (csrf) window.CSRF_TOKEN = csrf
  if (userScope) window.LEVEL_OS_USER_SCOPE = userScope
  if (sentryDsn) window.LEVEL_OS_SENTRY_DSN = sentryDsn

  if (authConfig) {
    try {
      const parsed = JSON.parse(authConfig) as { url?: unknown; publishableKey?: unknown } | null
      window.LEVEL_OS_AUTH_CONFIG =
        parsed && typeof parsed.url === "string" && typeof parsed.publishableKey === "string"
          ? { url: parsed.url, publishableKey: parsed.publishableKey }
          : null
    } catch {
      window.LEVEL_OS_AUTH_CONFIG = null
    }
  }
}
