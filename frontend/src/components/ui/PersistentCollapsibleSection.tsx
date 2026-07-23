import { ChevronDown } from "lucide-react"
import { useId, useState, type ReactNode } from "react"
import { cn } from "../../lib/cn"

interface PersistentCollapsibleSectionProps {
  storageKey: string
  title: string
  description?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  className?: string
  bodyClassName?: string
}

function readStoredState(key: string, fallback: boolean): boolean {
  try {
    const value = window.localStorage.getItem(key)
    return value === null ? fallback : value === "open"
  } catch {
    return fallback
  }
}

/** Seção colapsável nativa, acessível e persistida sem dependência adicional. */
export function PersistentCollapsibleSection({
  storageKey,
  title,
  description,
  children,
  defaultOpen = true,
  className,
  bodyClassName,
}: PersistentCollapsibleSectionProps) {
  const contentId = useId()
  const [open, setOpen] = useState(() => readStoredState(storageKey, defaultOpen))

  const toggle = () => {
    setOpen((current) => {
      const next = !current
      try {
        window.localStorage.setItem(storageKey, next ? "open" : "closed")
      } catch {
        // O accordion continua funcional quando o armazenamento estiver indisponível.
      }
      return next
    })
  }

  return (
    <section className={cn("level-panel min-w-0 border-t border-outline-variant/80", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={toggle}
        className="flex min-h-16 w-full items-center justify-between gap-4 py-4 text-left focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
      >
        <span className="min-w-0">
          <span className="block font-semibold text-on-surface">{title}</span>
          {description ? <span className="mt-0.5 block truncate text-sm text-muted">{description}</span> : null}
        </span>
        <ChevronDown aria-hidden="true" className={cn("size-4 shrink-0 text-muted transition-transform duration-200 motion-reduce:transition-none", open && "rotate-180")} />
      </button>
      <div id={contentId} hidden={!open} className={cn("level-collapsible-content pb-7", bodyClassName)}>
        {children}
      </div>
    </section>
  )
}
