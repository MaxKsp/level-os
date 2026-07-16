import { cn } from "@/lib/cn"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  /** Realça a borda no hover. Padrão: true. */
  hoverGlow?: boolean
  className?: string
}

export function Card({
  children,
  hoverGlow = true,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-outline-variant bg-surface-container-low transition-colors duration-300",
        hoverGlow && "hover:border-primary/40",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: CardHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-4 border-b border-outline-variant px-5 py-4 sm:px-6",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="font-semibold text-on-surface">{title}</h2>
        {description ? (
          <p className="mt-0.5 truncate text-sm text-on-surface-variant">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </header>
  )
}
