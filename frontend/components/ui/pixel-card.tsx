import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"

import { cn } from "@/lib/utils"

class Pixel {
  private readonly context: CanvasRenderingContext2D
  private readonly x: number
  private readonly y: number
  private readonly color: string
  private readonly speed: number
  private readonly delay: number
  private readonly sizeStep: number
  private readonly minSize = 0.5
  private readonly maxSize: number
  private counter = 0
  private readonly counterStep: number
  private size = 0
  private reverse = false
  isIdle = false

  constructor(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, x: number, y: number, color: string, speed: number, delay: number) {
    this.context = context
    this.x = x
    this.y = y
    this.color = color
    this.speed = (Math.random() * 0.8 + 0.1) * speed
    this.delay = delay
    this.sizeStep = Math.random() * 0.4
    this.maxSize = Math.random() * 1.5 + this.minSize
    this.counterStep = Math.random() * 4 + (canvas.width + canvas.height) * 0.01
  }

  draw() {
    const centerOffset = 1 - this.size * 0.5
    this.context.fillStyle = this.color
    this.context.fillRect(this.x + centerOffset, this.y + centerOffset, this.size, this.size)
  }

  drawStatic() {
    this.size = this.maxSize
    this.draw()
    this.isIdle = true
  }

  appear() {
    this.isIdle = false
    if (this.counter <= this.delay) {
      this.counter += this.counterStep
      return
    }
    if (this.size >= this.maxSize) this.reverse = true
    if (this.size <= this.minSize) this.reverse = false
    this.size += this.reverse ? -this.speed : this.size >= this.maxSize ? 0 : this.sizeStep
    this.draw()
  }

  disappear() {
    this.counter = 0
    if (this.size <= 0) {
      this.isIdle = true
      return
    }
    this.size -= 0.1
    this.draw()
  }
}

interface PixelCardProps {
  children: ReactNode
  className?: string
  gap?: number
  speed?: number
  autoPlay?: boolean
}

type PixelCardStyle = CSSProperties & { "--pixel-active-color": string }

/** Adaptado do Pixel Card do 21st.dev (componente 2270) para Vite e tokens Level OS. */
export function PixelCard({ children, className, gap = 8, speed = 28, autoPlay = false }: PixelCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pixelsRef = useRef<Pixel[]>([])
  const animationRef = useRef<number | null>(null)
  const previousTimeRef = useRef(0)
  const [active, setActive] = useState(autoPlay)
  const reducedMotion = useRef(window.matchMedia("(prefers-reduced-motion: reduce)").matches).current

  useEffect(() => { setActive(autoPlay) }, [autoPlay])

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    let disposed = false

    const cancel = () => {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    const initialize = () => {
      cancel()
      const rect = container.getBoundingClientRect()
      const width = Math.max(1, Math.floor(rect.width))
      const height = Math.max(1, Math.floor(rect.height))
      const context = canvas.getContext("2d", { alpha: true })
      if (!context) return
      canvas.width = width
      canvas.height = height
      const color = getComputedStyle(container).getPropertyValue("--pixel-active-color").trim() || "#31e6d4"
      const effectiveSpeed = speed * 0.001
      const pixels: Pixel[] = []
      for (let x = 0; x < width; x += gap) {
        for (let y = 0; y < height; y += gap) {
          const distance = Math.hypot(x - width / 2, y - height / 2)
          pixels.push(new Pixel(canvas, context, x, y, color, effectiveSpeed, distance))
        }
      }
      pixelsRef.current = pixels
      if (reducedMotion) {
        pixels.forEach((pixel, index) => { if (index % 3 === 0) pixel.drawStatic() })
      }
    }

    const animate = (mode: "appear" | "disappear") => {
      cancel()
      const frame = (time: number) => {
        if (disposed || document.hidden) return
        animationRef.current = requestAnimationFrame(frame)
        if (time - previousTimeRef.current < 1000 / 60) return
        previousTimeRef.current = time
        const context = canvas.getContext("2d")
        if (!context) return
        context.clearRect(0, 0, canvas.width, canvas.height)
        let allIdle = true
        for (const pixel of pixelsRef.current) {
          pixel[mode]()
          if (!pixel.isIdle) allIdle = false
        }
        if (mode === "disappear" && allIdle) cancel()
      }
      animationRef.current = requestAnimationFrame(frame)
    }

    initialize()
    if (!reducedMotion) animate(active ? "appear" : "disappear")

    const resizeObserver = new ResizeObserver(() => {
      initialize()
      if (!reducedMotion && active) animate("appear")
    })
    resizeObserver.observe(container)

    const handleVisibility = () => {
      if (document.hidden) cancel()
      else if (!reducedMotion) animate(active ? "appear" : "disappear")
    }
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      disposed = true
      cancel()
      resizeObserver.disconnect()
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [active, gap, reducedMotion, speed])

  const style: PixelCardStyle = {
    "--pixel-active-color": "color-mix(in srgb, var(--color-primary) 72%, transparent)",
  }

  return (
    <div
      ref={containerRef}
      style={style}
      className={cn(
        "relative isolate grid min-h-72 w-full select-none place-items-center overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low",
        className,
      )}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(autoPlay)}
      onFocusCapture={() => setActive(true)}
      onBlurCapture={() => setActive(autoPlay)}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />
      <div className="relative z-10 flex size-full flex-col items-center justify-center p-6 text-center">
        {children}
      </div>
    </div>
  )
}
