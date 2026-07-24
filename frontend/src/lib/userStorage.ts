declare global {
  interface Window {
    LEVEL_OS_USER_SCOPE?: string | null
  }
}

const USER_DATA_KEYS = [
  "level-os:tasks",
  "level-os:exercises",
  "level-os:finance:v1",
  "level-os:notifications:v1",
  "level-os:task-notification-log:v1",
  "level-os:onboarding-completed",
  "level-os:profile:v1",
  "level-os:training:v2",
] as const

const SENSITIVE_CACHE_KEYS = [
  "level-os:tasks",
  "level-os:exercises",
  "level-os:finance:v1",
  "level-os:profile:v1",
  "level-os:training:v2",
] as const

function currentUserScope(): string | null {
  if (typeof window === "undefined") return null
  const scope = String(window.LEVEL_OS_USER_SCOPE ?? "").trim()
  return /^[a-zA-Z0-9_-]{1,128}$/.test(scope) ? scope : null
}

/** Mantém preferências e caches de dados separados entre contas no mesmo navegador. */
export function userStorageKey(baseKey: string): string {
  const scope = currentUserScope()
  return scope ? `${baseKey}:user:${scope}` : baseKey
}

/**
 * Dados antigos não tinham dono identificável. Em uma sessão autenticada eles
 * não podem ser atribuídos ao usuário atual, pois podem pertencer a outra conta.
 */
export function clearUnscopedUserStorage(): void {
  if (!currentUserScope()) return
  try {
    USER_DATA_KEYS.forEach((key) => window.localStorage.removeItem(key))
  } catch {
    // O aplicativo continua usando o backend quando o storage está indisponível.
  }
}

/** Em produção os dados vivem no backend; remove cópias antigas de qualquer conta. */
export function clearSensitiveBrowserCaches(): void {
  if (!currentUserScope()) return
  try {
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index)
      if (!key) continue
      if (SENSITIVE_CACHE_KEYS.some((base) => key === base || key.startsWith(`${base}:user:`))) {
        window.localStorage.removeItem(key)
      }
    }
  } catch {
    // Sem acesso ao storage, o app continua usando apenas o backend.
  }
}

export const USER_STORAGE_BASE_KEYS = USER_DATA_KEYS
