import { AnimatePresence, useReducedMotion } from "motion/react"
import * as m from "motion/react-m"
import { Check } from "lucide-react"
import { useEffect, useId, useMemo, useRef, type ClipboardEvent, type KeyboardEvent } from "react"
import { cn } from "../../lib/cn"

export type OtpStatus = "idle" | "error" | "success"

interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  length?: number
  status?: OtpStatus
  disabled?: boolean
  autoFocus?: boolean
  label?: string
  hint?: string
  errorMessage?: string
  successMessage?: string
  className?: string
  onComplete?: (value: string) => void
}

function cleanDigits(value: string, length: number): string {
  return value.replace(/\D/g, "").slice(0, length)
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  status = "idle",
  disabled = false,
  autoFocus = false,
  label = "Código de verificação",
  hint,
  errorMessage,
  successMessage = "Verificado com sucesso",
  className,
  onComplete,
}: OtpInputProps) {
  const reduceMotion = useReducedMotion()
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  const lastCompleted = useRef("")
  const labelId = useId()
  const messageId = useId()
  const normalized = useMemo(() => cleanDigits(value, length), [length, value])
  const cells = Array.from({ length }, (_, index) => normalized[index] ?? "")

  useEffect(() => {
    if (!autoFocus || disabled || status === "success") return
    const nextIndex = Math.min(normalized.length, length - 1)
    inputRefs.current[nextIndex]?.focus()
  }, [autoFocus, disabled, length, normalized.length, status])

  useEffect(() => {
    if (normalized.length !== length) {
      lastCompleted.current = ""
      return
    }
    if (normalized !== lastCompleted.current) {
      lastCompleted.current = normalized
      onComplete?.(normalized)
    }
  }, [length, normalized, onComplete])

  const updateAt = (index: number, rawValue: string) => {
    const digit = rawValue.replace(/\D/g, "").slice(-1)
    const next = cells.slice()
    next[index] = digit
    const result = next.join("").slice(0, length)
    onChange(result)
    if (digit && index < length - 1) inputRefs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault()
      const next = cells.slice()
      if (next[index]) {
        next[index] = ""
        onChange(next.join(""))
      } else if (index > 0) {
        next[index - 1] = ""
        onChange(next.join(""))
        inputRefs.current[index - 1]?.focus()
      }
      return
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault(); inputRefs.current[index - 1]?.focus()
    } else if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault(); inputRefs.current[index + 1]?.focus()
    } else if (event.key === "Home") {
      event.preventDefault(); inputRefs.current[0]?.focus()
    } else if (event.key === "End") {
      event.preventDefault(); inputRefs.current[length - 1]?.focus()
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const pasted = cleanDigits(event.clipboardData.getData("text"), length)
    if (!pasted) return
    onChange(pasted)
    inputRefs.current[Math.min(pasted.length, length) - 1]?.focus()
  }

  const feedback = status === "error" ? errorMessage : status === "success" ? successMessage : hint

  return (
    <div className={cn("space-y-2.5", className)}>
      <span id={labelId} className="block text-xs font-medium text-on-surface">{label}</span>
      <div
        className="relative flex min-h-14 items-center justify-center"
        role="group"
        aria-labelledby={labelId}
        aria-describedby={feedback ? messageId : undefined}
        aria-invalid={status === "error" || undefined}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {status === "success" ? (
            <m.div
              key="verified"
              className="flex size-12 items-center justify-center rounded-xl border border-tertiary/35 bg-tertiary/12 text-tertiary"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: .72, rotate: -8 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 24 }}
            >
              <Check aria-hidden="true" className="size-6" strokeWidth={2.4} />
            </m.div>
          ) : (
            <m.div
              key="cells"
              className="flex w-full justify-center gap-2 sm:gap-2.5"
              animate={status === "error" && !reduceMotion ? { x: [0, -5, 5, -3, 3, 0] } : { x: 0 }}
              transition={{ duration: .32 }}
            >
              {cells.map((digit, index) => (
                <m.input
                  key={index}
                  ref={(node) => { inputRefs.current[index] = node }}
                  value={digit}
                  onChange={(event) => updateAt(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  onPaste={handlePaste}
                  onFocus={(event) => event.currentTarget.select()}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  aria-label={`${label}, dígito ${index + 1} de ${length}`}
                  disabled={disabled}
                  maxLength={1}
                  className={cn(
                    "size-11 min-w-0 rounded-lg border bg-surface-container text-center font-mono text-lg font-semibold tabular-nums text-on-surface caret-primary outline-none transition-[border-color,background-color,box-shadow] duration-200 sm:size-12",
                    "hover:border-outline focus:border-primary focus:bg-surface-container-high focus:ring-2 focus:ring-primary/15",
                    status === "error" && "border-error/70 text-error focus:border-error focus:ring-error/15",
                    disabled && "cursor-not-allowed opacity-55",
                  )}
                  exit={reduceMotion ? { opacity: 0 } : {
                    opacity: 0,
                    x: ((length - 1) / 2 - index) * 34,
                    scale: .72,
                  }}
                  transition={{ duration: .24, ease: "easeInOut" }}
                />
              ))}
            </m.div>
          )}
        </AnimatePresence>
      </div>
      {feedback ? (
        <m.p
          id={messageId}
          role={status === "error" ? "alert" : "status"}
          aria-live="polite"
          className={cn(
            "text-center text-xs leading-5 text-muted",
            status === "error" && "text-error",
            status === "success" && "font-medium text-tertiary",
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {feedback}
        </m.p>
      ) : null}
    </div>
  )
}
