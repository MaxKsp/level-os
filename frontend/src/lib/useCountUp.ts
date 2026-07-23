import { useEffect, useRef, useState } from "react"

const SESSION_PREFIX = "level-os:count-up:"
const animatedInMemory = new Set<string>()

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function wasAnimated(key: string): boolean {
  if (animatedInMemory.has(key)) return true
  try {
    return window.sessionStorage.getItem(`${SESSION_PREFIX}${key}`) === "1"
  } catch {
    return false
  }
}

function markAnimated(key: string): void {
  animatedInMemory.add(key)
  try {
    window.sessionStorage.setItem(`${SESSION_PREFIX}${key}`, "1")
  } catch {
    // O bloqueio de storage não pode impedir a métrica de aparecer.
  }
}

interface CountUpOptions {
  animationKey: string
  startValue?: number
  duration?: number
}

/**
 * Count-up curto e determinístico. Cada chave anima uma vez por sessão do
 * navegador; mudanças posteriores de dados são exibidas imediatamente.
 */
export function useCountUp(value: number, options: CountUpOptions): number {
  const { animationKey, startValue = value === 0 ? 0 : value * 0.92, duration = 700 } = options
  const [shouldAnimate] = useState(() => !prefersReducedMotion() && !wasAnimated(animationKey))
  const [displayValue, setDisplayValue] = useState(shouldAnimate ? startValue : value)
  const initialStartRef = useRef(startValue)
  const targetRef = useRef(value)
  const finishedRef = useRef(!shouldAnimate)

  useEffect(() => {
    targetRef.current = value
    if (finishedRef.current) setDisplayValue(value)
  }, [value])

  useEffect(() => {
    if (!shouldAnimate) return
    markAnimated(animationKey)

    const from = initialStartRef.current
    const startedAt = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / Math.max(1, duration))
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(from + (targetRef.current - from) * eased)
      if (progress < 1) {
        frame = window.requestAnimationFrame(tick)
      } else {
        finishedRef.current = true
        setDisplayValue(targetRef.current)
      }
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [animationKey, duration, shouldAnimate])

  return displayValue
}

/** Apenas para isolamento entre testes automatizados. */
export function resetCountUpSessionForTests(): void {
  animatedInMemory.clear()
  if (typeof window === "undefined") return
  try {
    Object.keys(window.sessionStorage)
      .filter((key) => key.startsWith(SESSION_PREFIX))
      .forEach((key) => window.sessionStorage.removeItem(key))
  } catch {
    // Sem storage, o Set em memória já foi limpo.
  }
}
