import { cn } from "../../../lib/cn"
import { AnimatedNumber } from "../../../components/ui/AnimatedNumber"

export function XpBar({ value, label, animationKey = "xp-bar", className }: { value: number; label?: string; animationKey?: string; className?: string }) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className={cn("space-y-2", className)}>
      {label ? <div className="flex justify-between text-xs text-muted"><span>{label}</span><AnimatedNumber value={clamped} animationKey={animationKey} formatValue={(current) => `${Math.round(current)}%`} /></div> : null}
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-highest" role="progressbar" aria-label={label ?? "Progresso de experiência"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(clamped)}>
        <div className="level-xp-fill relative h-full origin-left rounded-full bg-primary" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  )
}
