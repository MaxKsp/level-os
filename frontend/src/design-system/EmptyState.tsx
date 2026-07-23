import type { ReactNode } from "react"
import { Icon } from "./Icon"
import { cn } from "../lib/cn"

interface EmptyStateProps {
  title: string
  description: string
  icon?: string
  action?: ReactNode
  className?: string
}

/** Estado vazio orientado à próxima ação, inspirado nas referências do 21st. */
export function EmptyState({ title, description, icon = "inbox", action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center px-5 py-10 text-center sm:py-12", className)}>
      <span className="grid size-11 place-items-center rounded-xl border border-outline-variant bg-surface-container text-primary shadow-sm">
        <Icon name={icon} className="text-[21px]" />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-on-surface">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
