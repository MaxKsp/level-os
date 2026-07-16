import { cn } from "@/lib/cn"

interface IconProps {
  /** Nome do glyph do Material Symbols Outlined. */
  name: string
  className?: string
  filled?: boolean
  /** Rótulo acessível; quando ausente, o ícone é decorativo. */
  label?: string
}

export function Icon({ name, className, filled = false, label }: IconProps) {
  return (
    <span
      className={cn("material-symbols-outlined leading-none", className)}
      style={filled ? { fontVariationSettings: '"FILL" 1' } : undefined}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      {name}
    </span>
  )
}
