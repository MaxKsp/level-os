import { cn } from "@/lib/cn"
import { Icon } from "./icon"

type Dot = "primary" | "positive" | "warning" | "negative" | "none"

const DOTS: Record<Exclude<Dot, "none">, string> = {
  primary: "bg-primary",
  positive: "bg-tertiary",
  warning: "bg-warning",
  negative: "bg-error",
}

interface StatCardProps {
  label: string
  value: string
  note?: string
  icon?: string
  dot?: Dot
  className?: string
}

export function StatCard({
  label,
  value,
  note,
  icon,
  dot = "none",
  className,
}: StatCardProps) {
  return (
    <article
      className={cn(
        "rounded-2xl border border-outline-variant bg-surface-container-low p-5",
        className,
      )}
    >
      <div className="mb-5 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm text-on-surface-variant">
          {icon ? (
            <Icon name={icon} className="text-[18px] text-muted" />
          ) : null}
          {label}
        </p>
        {dot !== "none" ? (
          <span className={cn("h-2 w-2 rounded-full", DOTS[dot])} />
        ) : null}
      </div>
      <p className="font-mono text-2xl font-medium tracking-tight text-on-surface">
        {value}
      </p>
      {note ? <p className="mt-1 text-xs text-muted">{note}</p> : null}
    </article>
  )
}
