import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AnimatedNumber } from "../components/ui/AnimatedNumber"
import { resetCountUpSessionForTests } from "../lib/useCountUp"

describe("AnimatedNumber", () => {
  let frames: FrameRequestCallback[]

  beforeEach(() => {
    frames = []
    resetCountUpSessionForTests()
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.push(callback)
      return frames.length
    })
    vi.stubGlobal("cancelAnimationFrame", vi.fn())
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  })

  afterEach(() => vi.unstubAllGlobals())

  it("anima rapidamente apenas na primeira montagem da sessão", () => {
    const formatValue = (value: number) => Math.round(value).toLocaleString("pt-BR")
    const first = render(<AnimatedNumber value={100} startValue={0} duration={700} animationKey="metric" formatValue={formatValue} />)
    expect(screen.getByText("0")).toBeInTheDocument()
    const finishedAt = performance.now() + 800
    act(() => frames.shift()?.(finishedAt))
    expect(screen.getByText("100")).toBeInTheDocument()

    first.unmount()
    render(<AnimatedNumber value={100} startValue={0} duration={700} animationKey="metric" formatValue={formatValue} />)
    expect(screen.getByText("100")).toBeInTheDocument()
  })

  it("colapsa diretamente para o valor final com movimento reduzido", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    render(<AnimatedNumber value={80} startValue={0} animationKey="reduced" formatValue={(value) => Math.round(value).toString()} />)
    expect(screen.getByText("80")).toBeInTheDocument()
    expect(frames).toHaveLength(0)
  })
})
