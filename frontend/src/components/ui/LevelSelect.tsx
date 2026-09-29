import { useId, useRef, useState, useEffect, type KeyboardEvent, type ReactNode } from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "../../lib/cn"

type OptionValue = string | number
interface LevelSelectProps<T extends OptionValue> {
  value: T
  onChange: (value: T) => void
  options: ReadonlyArray<{ value: T; label: ReactNode; disabled?: boolean }>
  label?: string
  placeholder?: string
  className?: string
  disabled?: boolean
  name?: string
  required?: boolean
  id?: string
  "aria-label"?: string
  menuPlacement?: "auto" | "top" | "bottom"
}

/** Controlled, keyboard-accessible select. The popup is positioned outside document flow. */
export function LevelSelect<T extends OptionValue>({
  value, onChange, options, label, placeholder = "Selecione", className, disabled, name, required, id, menuPlacement = "auto", ...aria
}: LevelSelectProps<T>) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  const menuId = controlId + "-menu"
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [upward, setUpward] = useState(false)
  const chosen = options.findIndex((option) => String(option.value) === String(value))
  const selectable = options.map((option, i) => !option.disabled ? i : -1).filter((i) => i >= 0)
  const trigger = () => {
    if (open) { setOpen(false); return }
    const bounds = button.current?.getBoundingClientRect()
    const estimatedHeight = Math.min(240, options.length * 40 + 12)
    setUpward(menuPlacement === "top" || (menuPlacement === "auto" && !!bounds && window.innerHeight - bounds.bottom < estimatedHeight && bounds.top > window.innerHeight - bounds.bottom))
    setActive(chosen >= 0 && !options[chosen]?.disabled ? chosen : selectable[0] ?? 0)
    setOpen(true)
  }
  const select = (index: number) => {
    if (index < 0 || options[index]?.disabled) return
    onChange(options[index].value)
    setOpen(false)
    button.current?.focus()
  }
  const next = (direction: number) => {
    const position = selectable.indexOf(active)
    const index = selectable[(position + direction + selectable.length) % selectable.length]
    if (index !== undefined) setActive(index)
  }
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); button.current?.focus() }
    }
    document.addEventListener("pointerdown", outside)
    document.addEventListener("keydown", escape)
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape) }
  }, [open])
  const keyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      if (!open) trigger()
      else next(event.key === "ArrowDown" ? 1 : -1)
    } else if (event.key === "Home" && open) { event.preventDefault(); setActive(selectable[0] ?? 0) }
    else if (event.key === "End" && open) { event.preventDefault(); setActive(selectable.at(-1) ?? 0) }
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      if (open) select(active)
      else trigger()
    }
  }
  const selected = options[chosen]
  return <div ref={root} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }} className={cn("level-select relative min-w-0", className)}>
    {label ? <label id={controlId + "-label"} className="mb-1.5 block text-xs font-medium text-on-surface-variant">{label}</label> : null}
    {name ? <input type="hidden" name={name} value={String(value)} /> : null}
    <button id={controlId} ref={button} type="button" disabled={disabled} onKeyDown={keyboard}
      aria-label={aria["aria-label"]} aria-labelledby={!aria["aria-label"] && label ? controlId + "-label" : undefined}
      aria-haspopup="listbox" aria-expanded={open} aria-controls={menuId}
      aria-activedescendant={open ? menuId + "-" + active : undefined}
      aria-required={required || undefined}
      onClick={trigger}
      className="level-select-trigger flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-left text-sm text-on-surface outline-none transition-[border-color,box-shadow,background-color] duration-200 hover:border-outline focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-55">
      <span className={cn("min-w-0 flex-1 truncate", !selected && "text-muted")}>{selected?.label ?? placeholder}</span>
      <ChevronDown aria-hidden="true" className={cn("size-4 shrink-0 text-muted transition-transform duration-200 motion-reduce:transition-none", open && "rotate-180")} />
    </button>
    {open ? <div id={menuId} role="listbox" aria-label={aria["aria-label"] ?? label ?? "Opções"}
      className={cn("level-select-menu absolute left-0 right-0 z-[140] max-h-60 min-w-full overflow-y-auto overscroll-contain rounded-lg border border-outline bg-surface-container-low p-1 shadow-xl", upward ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]")}>
      {options.map((option, i) => <button type="button" role="option" key={String(option.value)}
        id={menuId + "-" + i} aria-selected={i === chosen} aria-disabled={option.disabled || undefined}
        disabled={option.disabled} onPointerEnter={() => setActive(i)} onClick={() => select(i)}
        className={cn("flex min-h-10 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm outline-none transition-colors duration-150 motion-reduce:transition-none",
          option.disabled ? "cursor-not-allowed opacity-40" : active === i ? "bg-primary/12 text-primary" : "text-on-surface hover:bg-surface-container-high")}>
        <span className="min-w-0 flex-1 truncate">{option.label}</span>
        {chosen === i ? <Check aria-hidden="true" className="size-4 shrink-0 text-primary" /> : null}
      </button>)}
    </div> : null}
  </div>
}
