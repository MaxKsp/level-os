/**
 * Registro do service worker do Level OS.
 *
 * Contrato explícito do produto: a PWA é **instalável e online-first**.
 * O worker acelera e dá tolerância a rede instável para assets públicos
 * versionados; ele nunca guarda HTML autenticado, resposta de API ou dado
 * pessoal. Offline completo do painel não é prometido.
 */

const SERVICE_WORKER_URL = "/sw.js"
const RELOAD_GUARD = "level-os:sw-reloaded"

export interface RegisterServiceWorkerOptions {
  /** Sobrescreve a detecção de contexto seguro nos testes. */
  enabled?: boolean
  /** Injeção usada nos testes para evitar reload real. */
  reload?: () => void
}

function supported(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator
}

/**
 * Service worker exige contexto seguro. Em ambiente sem HTTPS o registro é
 * dispensado, evitando erro previsível no console.
 */
function secureContext(): boolean {
  return typeof window !== "undefined" && window.isSecureContext === true
}

/**
 * Registra o worker e mantém uma atualização previsível: quando uma nova versão
 * assume o controle, a página recarrega uma única vez por sessão para não deixar
 * assets antigos e novos misturados.
 */
export async function registerServiceWorker(options: RegisterServiceWorkerOptions = {}): Promise<ServiceWorkerRegistration | null> {
  const enabled = options.enabled ?? secureContext()
  if (!enabled || !supported()) return null

  try {
    const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: "/" })

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      try {
        if (sessionStorage.getItem(RELOAD_GUARD)) return
        sessionStorage.setItem(RELOAD_GUARD, "1")
      } catch {
        // Sem sessionStorage não há guarda; melhor não recarregar do que entrar em loop.
        return
      }
      ;(options.reload ?? (() => window.location.reload()))()
    })

    // Busca atualização ao voltar para a aba, sem poll periódico.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void registration.update().catch(() => undefined)
    })

    return registration
  } catch {
    // Falha de registro não pode impedir o uso do aplicativo.
    return null
  }
}
