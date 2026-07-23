import type { ReactNode } from "react"
import { cn } from "../lib/cn"

interface SectionCardProps {
  title: string
  description?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

/** Seção editorial leve: hierarquia por espaço e um único hairline. */
export function SectionCard({
  title,
  description,
  icon,
  action,
  children,
  className,
  bodyClassName,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        "level-panel relative min-w-0 w-full border-t border-outline-variant/80 bg-transparent",
        className,
      )}
    >
      <header className="relative flex min-w-0 items-start justify-between gap-4 px-0 pb-3 pt-5">
        <div className="flex min-w-0 items-center gap-3">
          {icon}
          <div className="min-w-0">
            <h2 className="font-semibold text-on-surface">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-sm text-muted">{description}</p>
            ) : null}
          </div>
        </div>
        <span className="shrink-0">{action}</span>
      </header>
      <div className={cn("relative pb-7 pt-2", bodyClassName)}>{children}</div>
    </section>
  )
}
