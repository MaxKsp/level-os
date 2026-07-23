import type { ReactNode } from "react"
import { cn } from "../lib/cn"

type Tone = "neutral" | "primary" | "positive" | "warning" | "secondary"

const TONES: Record<Tone, string> = {
  neutral: "bg-white/[0.06] text-on-surface-variant",
  primary: "bg-primary/15 text-primary",
  positive: "bg-tertiary/15 text-tertiary",
  warning: "bg-warning/15 text-warning",
  secondary: "bg-secondary/15 text-secondary",
}

interface BadgeProps {
  children: ReactNode
  tone?: Tone
  className?: string
}

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
