import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { render, screen, within } from "@testing-library/react"
import { domAnimation, LazyMotion, MotionConfig } from "motion/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LandingPage } from "../marketing/LandingPage"

const frontendRoot = resolve(__dirname, "../..")
const readSource = (relative: string) => readFileSync(resolve(frontendRoot, relative), "utf8")
const defaultIntersectionObserver = window.IntersectionObserver
const defaultMatchMedia = window.matchMedia

class InertIntersectionObserver implements IntersectionObserver {
  readonly root = null
  readonly rootMargin = "0px"
  readonly thresholds = [0]

  disconnect() {}
  observe() {}
  takeRecords(): IntersectionObserverEntry[] { return [] }
  unobserve() {}
}

function renderLanding() {
  return render(
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="never">
        <LandingPage />
      </MotionConfig>
    </LazyMotion>,
  )
}

describe("Landing — visibilidade resiliente", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener() {},
        addListener() {},
        dispatchEvent() { return false },
        removeEventListener() {},
        removeListener() {},
      })),
    })
    Object.defineProperty(window, "IntersectionObserver", {
      configurable: true,
      value: InertIntersectionObserver,
      writable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, "IntersectionObserver", {
      configurable: true,
      value: defaultIntersectionObserver,
      writable: true,
    })
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: defaultMatchMedia,
      writable: true,
    })
  })

  it("mantém hero, CTAs e seções legíveis quando o observer nunca dispara", () => {
    const { container } = renderLanding()
    const hero = container.querySelector<HTMLElement>("#inicio")

    expect(hero).not.toBeNull()
    const heroQueries = within(hero!)
    expect(heroQueries.getByRole("heading", { level: 1, name: /Comece pelo que\s*importa hoje/i })).toBeVisible()
    expect(heroQueries.getByText(/Uma tela inicial que reúne seu dinheiro/i)).toBeVisible()
    expect(heroQueries.getByRole("link", { name: /Começar grátis/i })).toBeVisible()
    expect(heroQueries.getByRole("link", { name: /Explorar o sistema/i })).toBeVisible()
    expect(heroQueries.getByRole("img", { name: /Tela real da Visão Geral/i })).toBeVisible()

    expect(screen.getByRole("heading", { name: /Uma jornada/i })).toBeVisible()
    expect(screen.getByRole("heading", { name: /Entenda seu dinheiro/i })).toBeVisible()
    expect(screen.getByRole("heading", { name: /Cinco áreas/i })).toBeVisible()
    expect(screen.getByRole("heading", { name: /Um especialista para cada parte/i })).toBeVisible()
    expect(screen.getByRole("heading", { name: /Trinta dias para montar/i })).toBeVisible()
    expect(screen.getByRole("heading", { name: /Antes de começar/i })).toBeVisible()
  })

  it("monta normalmente quando IntersectionObserver não existe", () => {
    Reflect.deleteProperty(window, "IntersectionObserver")
    expect(() => renderLanding()).not.toThrow()
    expect(screen.getByRole("heading", { level: 1, name: /Comece pelo que\s*importa hoje/i })).toBeVisible()
  })

  it("não torna Motion assíncrono nem restaura opacidade zero no hero", () => {
    const main = readSource("src/marketing/main.tsx")
    const landing = readSource("src/marketing/LandingPage.tsx")

    expect(main).toContain("features={domAnimation}")
    expect(main).not.toMatch(/import\([^)]*motionFeatures/)
    expect(landing).not.toMatch(/className="hero-(?:edition|lower|product)"[^>]*initial=\{\{[^}]*opacity:\s*0/)
    expect(landing).not.toMatch(/<m\.h1[^>]*initial=\{\{[^}]*opacity:\s*0/)
  })
})
