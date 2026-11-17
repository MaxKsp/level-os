import type { ReactNode } from "react"
import { Check } from "lucide-react"
import { cn } from "../../lib/cn"

export type LevelStepStatus = "complete" | "active" | "pending"

export interface LevelStepItem {
  id: string
  title: string
  description: string
  icon: ReactNode
  status: LevelStepStatus
  trailing?: ReactNode
  statusLabel?: string
}

export function LevelStepList({ items, ariaLabel, className }: {
  items: LevelStepItem[]
  ariaLabel: string
  className?: string
}) {
  return <div className={cn("divide-y divide-outline-variant border-y border-outline-variant", className)}
    role="list" aria-label={ariaLabel}>
    {items.map((item) => <section key={item.id} role="listitem"
      className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
      <StepIcon item={item} />
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-on-surface">{item.title}</h3>
        <p className="mt-1 text-xs leading-5 text-on-surface-variant">{item.description}</p>
      </div>      {item.trailing ?? <StepStatus status={item.status} label={item.statusLabel} />}
    </section>)}
  </div>
}

function StepIcon({ item }: { item: LevelStepItem }) {
  if (item.status === "complete") {
    return <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
      <Check className="size-4" />
    </span>
  }
  return <span className={cn(
    "grid size-10 shrink-0 place-items-center rounded-lg transition-colors",
    item.status === "active"
      ? "bg-primary/12 text-primary ring-1 ring-primary/25"
      : "bg-surface-container text-on-surface-variant",
  )}>{item.icon}</span>
}

function StepStatus({ status, label }: { status: LevelStepStatus; label?: string }) {
  const text = label ?? (status === "complete" ? "Concluído" : status === "active" ? "Agora" : "Próximo")
  return <span className={cn(
    "shrink-0 text-xs font-semibold",
    status === "pending" ? "text-muted" : "text-primary",
  )}>{text}</span>
}
