import * as Dialog from "@radix-ui/react-dialog"
import { forwardRef, useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type InputHTMLAttributes } from "react"
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, X } from "lucide-react"
import { cn } from "../../lib/cn"

type PickerType = "date" | "time" | "datetime-local"
interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue" | "onChange"> {
  type?: PickerType
  value: string
  label?: string
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
}
const pad = (n: number) => String(n).padStart(2, "0")
const iso = (d: Date) => [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join("-")
const localToday = () => iso(new Date())
const validDate = (s: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const [y, m, day] = s.split("-").map(Number)
  const d = new Date(y, m - 1, day)
  return d.getFullYear() === y && d.getMonth() === m - 1 && d.getDate() === day ? d : null
}
const timeFrom = (value: string, type: PickerType) => {
  const match = (type === "datetime-local" ? value.slice(11) : value).match(/^(\d{2}):(\d{2})/)
  return match ? [Number(match[1]), Number(match[2])] : [new Date().getHours(), new Date().getMinutes()]
}
const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
const formatDisplay = (value: string, type: PickerType) => {
  if (!value) return type === "time" ? "Selecionar horário" : "Selecionar data"
  if (type === "time") return value.slice(0, 5)
  const d = validDate(value.slice(0, 10))
  return d ? d.toLocaleDateString("pt-BR") + (type === "datetime-local" ? " às " + value.slice(11, 16) : "") : "Selecionar data"
}
/** Modal de calendario/horario 100% Level OS: nenhum picker nativo é exibido. */
export const LevelDateInput = forwardRef<HTMLInputElement, Props>(function LevelDateInput({
  type = "date", value, label, className, disabled, readOnly, onChange, id, name,
  min, max, required, placeholder, "aria-label": ariaLabel, ...rest
}, forwardedRef) {
  const pickerType = type as PickerType
  const generatedId = useId()
  const controlId = id ?? generatedId
  const nativeRef = useRef<HTMLInputElement | null>(null)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => {
    const date = validDate(value.slice(0, 10)) ?? new Date()
    return new Date(date.getFullYear(), date.getMonth(), 1)
  })
  const [yearDraft, setYearDraft] = useState(() => String(view.getFullYear()))
  const [draft, setDraft] = useState(() => validDate(value.slice(0, 10)) ? value.slice(0, 10) : localToday())
  const initial = timeFrom(value, pickerType)
  const [hours, setHours] = useState(initial[0])
  const [minutes, setMinutes] = useState(initial[1])
  const isDate = type !== "time"
  const isTime = type !== "date"
  const lower = min == null ? "" : String(min)
  const upper = max == null ? "" : String(max)
  const allowedDay = (candidate: string) => (!lower || candidate >= lower.slice(0, 10)) &&
    (!upper || candidate <= upper.slice(0, 10))
  const withinLimits = (candidate: string) => (!lower || candidate >= lower) && (!upper || candidate <= upper)
  const selectedTime = pad(hours) + ":" + pad(minutes)
  const candidate = type === "date" ? draft : type === "time" ? selectedTime : draft + "T" + selectedTime
  const commit = (next: string) => {
    if (next && !withinLimits(next)) return
    const input = nativeRef.current
    if (!input) return
    input.value = next
    onChange?.({ target: { value: next }, currentTarget: { value: next } } as unknown as ChangeEvent<HTMLInputElement>)
    setOpen(false)
  }
  const start = () => {
    const selected = validDate(value.slice(0, 10)) ?? validDate(lower.slice(0, 10)) ?? validDate(upper.slice(0, 10)) ?? new Date()
    setView(new Date(selected.getFullYear(), selected.getMonth(), 1))
    setYearDraft(String(selected.getFullYear()))
    setDraft(iso(selected))
    const [h, m] = timeFrom(value, pickerType)
    setHours(h); setMinutes(m)
    setOpen(true)
  }
  // O valor real de formulário é oculto (nunca um input date/time nativo).
  // Como campos hidden não participam da validação HTML, o requisito de
  // preenchimento é verificado antes de o formulário receber o submit.
  useEffect(() => {
    if (!required || disabled) return
    const form = nativeRef.current?.form
    if (!form) return
    const enforceRequired = (event: Event) => {
      if (value) return
      event.preventDefault()
      event.stopPropagation()
      start()
    }
    form.addEventListener("submit", enforceRequired, true)
    return () => form.removeEventListener("submit", enforceRequired, true)
  }, [required, disabled, value, type, min, max])
  const calendar = useMemo(() => {
    const year = view.getFullYear(), month = view.getMonth()
    const first = new Date(year, month, 1)
    const offset = (first.getDay() + 6) % 7
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(year, month, index + 1 - offset)
      return { date: iso(date), number: date.getDate(), inMonth: date.getMonth() === month }
    })
  }, [view])
  const move = (months: number) => {
    const next = new Date(view.getFullYear(), view.getMonth() + months, 1)
    setView(next); setYearDraft(String(next.getFullYear()))
  }
  const title = type === "time" ? "Selecionar horário" : type === "date" ? "Selecionar data" : "Selecionar data e horário"
  const icon = type === "time" ? <Clock3 className="size-4" /> : <CalendarDays className="size-4" />
  return <Dialog.Root open={open} onOpenChange={(next) => { if (!next) setOpen(false); else start() }}>
    <div className={cn("level-date block min-w-0", className)}>
      {label ? <label className="mb-1.5 block text-xs font-medium text-on-surface-variant" htmlFor={controlId}>{label}</label> : null}
      <input ref={(node) => {
        nativeRef.current = node
        if (typeof forwardedRef === "function") forwardedRef(node)
        else if (forwardedRef) forwardedRef.current = node
      }} type="hidden" value={value} name={name}
        disabled={disabled} tabIndex={-1} aria-hidden="true" onChange={onChange} {...rest} />
      <Dialog.Trigger asChild>
        <button id={controlId} type="button" disabled={disabled || readOnly} onClick={start}
          aria-label={ariaLabel ?? label ?? title} aria-required={required || undefined}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-left text-sm tabular-nums text-on-surface transition-[border-color,box-shadow,background-color] hover:border-outline focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none">
          <span className={cn(!value && "text-muted")}>{value ? formatDisplay(value, pickerType) : placeholder ?? formatDisplay("", pickerType)}</span>
          <span className="text-primary" aria-hidden="true">{icon}</span>
        </button>
      </Dialog.Trigger>
    </div>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[220] bg-black/75 backdrop-blur-[3px]" />
      <Dialog.Content aria-describedby={controlId + "-description"}
        className="fixed left-1/2 top-1/2 z-[221] w-[calc(100vw-1.5rem)] max-w-[22rem] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-on-surface shadow-[var(--shadow-panel)] outline-none sm:p-5"
        style={{ maxHeight: "min(94dvh, 680px)" }}>
        <span aria-hidden="true" className="absolute left-5 top-0 h-0.5 w-12 rounded-full bg-primary" />
        <header className="flex items-start justify-between gap-3 border-b border-outline-variant pb-4">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">Level OS / Calendário</span>
            <Dialog.Title className="mt-1 text-lg font-semibold">{title}</Dialog.Title>
            <Dialog.Description id={controlId + "-description"} className="mt-1 text-xs text-muted">
              Escolha usando o calendário e confirme quando necessário.
            </Dialog.Description>
          </div>
          <Dialog.Close aria-label="Fechar calendário" className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-2 focus-visible:outline-primary">
            <X className="size-4" />
          </Dialog.Close>
        </header>
        {isDate ? <div className="pt-4">
          <div className="flex items-center justify-between gap-2">
            <button type="button" aria-label="Mês anterior" onClick={() => move(-1)}
              className="grid size-10 place-items-center rounded-lg border border-outline-variant hover:border-primary/35 hover:bg-primary/10"><ChevronLeft className="size-4" /></button>
            <div className="min-w-0 text-center">
              <p className="text-sm font-semibold capitalize">{view.toLocaleDateString("pt-BR", { month: "long" })}</p>
              <label className="flex items-center justify-center gap-2 text-[11px] text-muted">Ano
                <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4} aria-label="Ano do calendário"
                  value={yearDraft} onChange={(event) => {
                    const next = event.target.value.replace(/\D/g, "").slice(0, 4)
                    setYearDraft(next)
                    const year = Number(next)
                    if (next.length === 4 && year >= 1800 && year <= 2200) setView(new Date(year, view.getMonth(), 1))
                  }} onBlur={() => setYearDraft(String(view.getFullYear()))}
                  className="w-17 rounded-md border border-outline-variant bg-surface px-1 py-0.5 text-center text-xs tabular-nums text-on-surface outline-none focus:border-primary" />
              </label>
            </div>
            <button type="button" aria-label="Próximo mês" onClick={() => move(1)}
              className="grid size-10 place-items-center rounded-lg border border-outline-variant hover:border-primary/35 hover:bg-primary/10"><ChevronRight className="size-4" /></button>
          </div>
          <div role="grid" aria-label={"Dias de " + view.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            className="mt-4 grid grid-cols-7 gap-1">
            {weekdays.map((day) => <span role="columnheader" key={day} className="py-1.5 text-center text-[11px] font-semibold text-muted">{day}</span>)}
            {calendar.map((day) => {
              const selected = draft === day.date
              const blocked = !allowedDay(day.date)
              return <button key={day.date} type="button" role="gridcell" disabled={blocked}
                aria-label={new Date(day.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
                aria-selected={selected} aria-current={day.date === localToday() ? "date" : undefined}
                onClick={() => {
                  setDraft(day.date)
                  if (type === "date") commit(day.date)
                }}
                className={cn("grid aspect-square min-h-9 place-items-center rounded-lg text-sm tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-25 motion-reduce:transition-none",
                  selected ? "bg-primary text-on-primary font-bold" : day.date === localToday() ? "border border-primary/55 text-primary" :
                    day.inMonth ? "text-on-surface hover:bg-primary/10" : "text-muted/60 hover:bg-surface-container-high")}>
                {day.number}
              </button>
            })}
          </div>
        </div> : null}
        {isTime ? <div className="mt-4 rounded-xl border border-outline-variant bg-surface p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[.12em] text-muted">Horário · formato 24 horas</p>
          <div className="flex items-center justify-center gap-2">
            <label className="grid gap-1 text-center text-[11px] text-muted">Hora
              <input type="number" aria-label="Hora" min={0} max={23} value={pad(hours)}
                onChange={(event) => setHours(Math.max(0, Math.min(23, Number(event.target.value) || 0)))}
                className="h-14 w-20 rounded-lg border border-outline-variant bg-surface-container text-center text-2xl tabular-nums text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
            </label>
            <span className="pt-3 text-xl font-semibold text-primary">:</span>
            <label className="grid gap-1 text-center text-[11px] text-muted">Minuto
              <input type="number" aria-label="Minuto" min={0} max={59} value={pad(minutes)}
                onChange={(event) => setMinutes(Math.max(0, Math.min(59, Number(event.target.value) || 0)))}
                className="h-14 w-20 rounded-lg border border-outline-variant bg-surface-container text-center text-2xl tabular-nums text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
            </label>
          </div>
        </div> : null}
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-outline-variant pt-4">
          <div className="flex gap-1.5">
            <button type="button" disabled={type !== "time" && !allowedDay(localToday())}
              onClick={() => {
                const now = new Date()
                if (type === "date") commit(localToday())
                else if (type === "time") { setHours(now.getHours()); setMinutes(now.getMinutes()) }
                else { setDraft(localToday()); setView(new Date(now.getFullYear(), now.getMonth(), 1)); setHours(now.getHours()); setMinutes(now.getMinutes()) }
              }}
              className="min-h-10 rounded-lg border border-outline-variant px-2.5 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-30">
              {type === "time" ? "Agora" : "Hoje"}
            </button>
            {!required ? <button type="button" onClick={() => commit("")} className="min-h-10 px-2 text-xs font-semibold text-muted hover:text-on-surface">Limpar</button> : null}
          </div>
          <div className="flex items-center gap-1.5">
            <Dialog.Close className="min-h-10 rounded-lg px-3 text-xs font-semibold text-muted hover:bg-surface-container">Cancelar</Dialog.Close>
            {type !== "date" ? <button type="button" disabled={!withinLimits(candidate)} onClick={() => commit(candidate)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-on-primary hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
              <Check className="size-3.5" />Confirmar</button> : null}
          </div>
        </div>
        {(lower || upper) ? <p className="mt-3 text-center text-[10px] text-muted">
          {lower ? "A partir de " + lower.replace("T", " ") : ""}{lower && upper ? " · " : ""}{upper ? "Até " + upper.replace("T", " ") : ""}
        </p> : null}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
})
