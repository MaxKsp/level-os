import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { registerServiceWorker } from "../lib/pwa"

const repoRoot = resolve(__dirname, "../../..")
const read = (relative: string) => readFileSync(resolve(repoRoot, relative), "utf8")

describe("PWA — documentos instaláveis", () => {
  it("referencia o manifest nas duas entradas servidas ao usuário", () => {
    for (const entry of ["frontend/index.html", "frontend/landing.html"]) {
      expect(read(entry)).toMatch(/<link\s+rel="manifest"\s+href="\/manifest\.json"/)
    }
  })

  it("mantém o manifest coerente com ícones versionados no repositório", () => {
    const manifest = JSON.parse(read("manifest.json")) as {
      display: string
      start_url: string
      icons: { src: string; sizes: string }[]
    }
    expect(manifest.display).toBe("standalone")
    expect(manifest.start_url).toBeTruthy()
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3)
    // Ícone ausente quebra instalação; o arquivo precisa existir de fato.
    manifest.icons.forEach((icon) => expect(() => read(icon.src)).not.toThrow())
    expect(manifest.icons.some((icon) => icon.sizes.includes("192"))).toBe(true)
    expect(manifest.icons.some((icon) => icon.sizes.includes("512"))).toBe(true)
  })

  it("registra o service worker nas entradas autenticada e pública", () => {
    for (const entry of ["frontend/src/main.tsx", "frontend/src/marketing/main.tsx"]) {
      const source = read(entry)
      expect(source).toContain("registerServiceWorker")
      expect(source).toMatch(/addEventListener\(["']load["']/)
    }
  })

  it("usa bootstrap de tema externo, compatível com script-src 'self'", () => {
    const html = read("frontend/index.html")
    expect(html).toContain('<script src="/theme-boot.js"></script>')
    expect(html).not.toMatch(/<script>[\s\S]*localStorage/)
    // A chave precisa ser a mesma do runtime, senão o tema pisca a cada carga.
    const boot = read("frontend/public/theme-boot.js")
    expect(boot).toContain("level-os:theme")
    expect(boot).not.toMatch(/getItem\('orby_theme'\)/)
  })
})

describe("PWA — contrato de cache do service worker", () => {
  const worker = read("sw.js")

  it("cobre os chunks versionados do app", () => {
    expect(worker).toContain("/frontend-assets/")
    expect(worker).toContain("cacheFirst")
  })

  it("nunca intercepta navegação, API ou requisição com query", () => {
    expect(worker).toMatch(/request\.mode === 'navigate'/)
    expect(worker).toMatch(/url\.search/)
    expect(worker).toMatch(/request\.method !== 'GET'/)
    expect(worker).not.toContain("/api/")
  })

  it("tolera asset ausente no precache em vez de abortar a instalação", () => {
    expect(worker).not.toContain("addAll")
    expect(worker).toMatch(/cache\.add\([^)]*\)\.catch/)
  })

  it("versiona o cache e remove versões antigas ao ativar", () => {
    expect(worker).toMatch(/const CACHE = 'level-os-static-v\d+'/)
    expect(worker).toContain("caches.delete")
  })
})

describe("registerServiceWorker", () => {
  const register = vi.fn()
  const listeners = new Map<string, () => void>()

  beforeEach(() => {
    register.mockReset()
    listeners.clear()
    sessionStorage.clear()
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        register,
        addEventListener: (type: string, listener: () => void) => listeners.set(type, listener),
      },
    })
  })

  afterEach(() => {
    Reflect.deleteProperty(navigator, "serviceWorker")
  })

  it("não registra quando desabilitado", async () => {
    expect(await registerServiceWorker({ enabled: false })).toBeNull()
    expect(register).not.toHaveBeenCalled()
  })

  it("registra no escopo raiz", async () => {
    const registration = { update: vi.fn() }
    register.mockResolvedValue(registration)
    expect(await registerServiceWorker({ enabled: true })).toBe(registration)
    expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/" })
  })

  it("recarrega uma única vez quando uma nova versão assume o controle", async () => {
    register.mockResolvedValue({ update: vi.fn() })
    const reload = vi.fn()
    await registerServiceWorker({ enabled: true, reload })

    listeners.get("controllerchange")?.()
    listeners.get("controllerchange")?.()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it("falha de registro não propaga erro para a aplicação", async () => {
    register.mockRejectedValue(new Error("sem https"))
    expect(await registerServiceWorker({ enabled: true })).toBeNull()
  })
})
