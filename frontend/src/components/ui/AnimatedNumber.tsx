import type { ComponentPropsWithoutRef } from "react"
import { cn } from "../../lib/cn"
import { useCountUp } from "../../lib/useCountUp"

const decimalFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 })

interface AnimatedNumberProps extends Omit<ComponentPropsWithoutRef<"span">, "children"> {
  value: number
  animationKey: string
  startValue?: number
  duration?: number
  formatValue?: (value: number) => string
}

export function AnimatedNumber({
  value,
  animationKey,
  startValue,
  duration = 700,
  formatValue = (current) => decimalFormatter.format(current),
  className,
  ...props
}: AnimatedNumberProps) {
  const current = useCountUp(value, { animationKey, startValue, duration })
  const formattedFinal = formatValue(value)

  return (
    <span
      {...props}
      className={cn("numeric-value inline-block", className)}
      data-numeric="true"
      aria-label={props["aria-label"] ?? formattedFinal}
    >
      {formatValue(current)}
    </span>
  )
}
