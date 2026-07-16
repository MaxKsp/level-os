import { cn } from "@/lib/cn"

type Tone = "neutral" | "primary" | "positive" | "warning" | "negative"

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-container-high text-on-surface-variant",
  primary: "bg-primary/15 text-primary",
  positive: "bg-tertiary/15 text-tertiary",
  warning: "bg-warning/15 text-warning",
  negative: "bg-error/15 text-error",
}

interface BadgeProps {
  children: React.ReactNode
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
