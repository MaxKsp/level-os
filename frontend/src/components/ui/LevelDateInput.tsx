import { forwardRef, useRef, type InputHTMLAttributes } from "react"
import { CalendarDays, Clock3 } from "lucide-react"
import { cn } from "../../lib/cn"

type DateInputType = "date" | "time" | "datetime-local"
interface LevelDateInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  type?: DateInputType
  label?: string
}

/** Keeps native date/time semantics, ISO values, keyboard and mobile pickers. */
export const LevelDateInput = forwardRef<HTMLInputElement, LevelDateInputProps>(function LevelDateInput({
  type = "date", label, className, disabled, ...props
}, forwardedRef) {
  const localRef = useRef<HTMLInputElement>(null)
  const Icon = type === "time" ? Clock3 : CalendarDays
  return <span className={cn("level-date relative block min-w-0", className)}>
    {label ? <span className="mb-1.5 block text-xs font-medium text-on-surface-variant">{label}</span> : null}
    <span className="relative flex min-h-11 min-w-0 items-center rounded-lg border border-outline-variant bg-surface-container transition-[border-color,box-shadow,background-color] duration-200 hover:border-outline focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 motion-reduce:transition-none">
      <input ref={(node) => { localRef.current = node; if (typeof forwardedRef === "function") forwardedRef(node); else if (forwardedRef) forwardedRef.current = node }}
        type={type} disabled={disabled} {...props}
        className="level-date-input min-h-10 min-w-0 w-full flex-1 rounded-lg border-0 bg-transparent py-2 pl-3 pr-11 text-sm tabular-nums text-on-surface outline-none disabled:cursor-not-allowed disabled:opacity-55" />
      <button type="button" disabled={disabled} tabIndex={-1} aria-label={type === "time" ? "Abrir seletor de horário" : "Abrir calendário"}
        onClick={() => { const input = localRef.current; if (!input) return; try { input.showPicker?.() } catch { input.focus() } }}
        className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-lg text-muted transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40">
        <Icon aria-hidden="true" className="size-4" />
      </button>
    </span>
  </span>
})
