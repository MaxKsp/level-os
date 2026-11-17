import { forwardRef, type InputHTMLAttributes } from "react"
import { cn } from "../../lib/cn"

interface CurrencyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> {
  value: string
  onValueChange: (value: string) => void
}

const formatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(function CurrencyInput(
  { value, onValueChange, className, ...props },
  ref,
) {
  const display = value === "" ? "" : formatter.format(Number(value) || 0)
  return (
    <input
      {...props}
      ref={ref}
      type="text"
      inputMode="numeric"
      value={display}
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, "")
        onValueChange(digits ? String(Number(digits) / 100) : "")
      }}
      className={cn("font-mono tabular-nums", className)}
    />
  )
})
