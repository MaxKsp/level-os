import { useRef, type KeyboardEvent, type PointerEvent } from "react"
import { cn } from "../../lib/cn"

interface LevelRangeProps {
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  label: string
  className?: string
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function LevelRange({ value, min, max, step = 1, onChange, label, className }: LevelRangeProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const percent = max === min ? 0 : ((value - min) / (max - min)) * 100

  const updateFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || rect.width <= 0) return
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1)
    const raw = min + ratio * (max - min)
    const next = Math.round(raw / step) * step
    onChange(Number(clamp(next, min, max).toFixed(4)))
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta = event.key === "ArrowRight" || event.key === "ArrowUp"
      ? step
      : event.key === "ArrowLeft" || event.key === "ArrowDown"
        ? -step
        : 0
    if (delta === 0 && event.key !== "Home" && event.key !== "End") return
    event.preventDefault()
    if (event.key === "Home") return onChange(min)
    if (event.key === "End") return onChange(max)
    onChange(Number(clamp(value + delta, min, max).toFixed(4)))
  }

  return <div
    ref={trackRef}
    role="slider"
    tabIndex={0}
    aria-label={label}
    aria-valuemin={min}
    aria-valuemax={max}
    aria-valuenow={value}
    onPointerDown={(event) => {
      event.currentTarget.setPointerCapture(event.pointerId)
      updateFromPointer(event)
    }}
    onPointerMove={(event) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) updateFromPointer(event)
    }}
    onKeyDown={onKeyDown}
    className={cn(
      "relative h-11 cursor-pointer touch-none select-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/45",
      className,
    )}
  >
    <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-surface-container-highest" />
    <div
      className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-primary"
      style={{ width: `${clamp(percent, 0, 100)}%` }}
    />
    <div
      className="absolute top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary shadow-sm transition-transform active:scale-110"
      style={{ left: `${clamp(percent, 0, 100)}%` }}
      aria-hidden="true"
    />
  </div>
}
