import { cn } from "@/lib/cn"

type Variant = "primary" | "secondary" | "ghost" | "danger"
type Size = "sm" | "md" | "lg"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: React.ReactNode
  className?: string
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:brightness-110",
  secondary:
    "border border-outline bg-surface-container text-on-surface hover:border-primary/50 hover:bg-surface-container-high",
  ghost: "text-on-surface-variant hover:bg-white/5 hover:text-on-surface",
  danger:
    "border border-error/30 bg-error/10 text-error hover:bg-error/20 hover:border-error/50",
}

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-sm",
}

export function Button({
  variant = "primary",
  size = "md",
  children,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
