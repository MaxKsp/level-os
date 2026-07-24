import { useMemo, useState, type FormEvent } from "react"
import { Button } from "../../components/ui/Button"
import { Input } from "../../components/ui/Input"
import { useApp, type Task } from "../../context/AppContext"
import { Icon } from "../../design-system"
import { cn } from "../../lib/cn"
import type { Priority, TaskRepeat } from "./contracts"
import { TODAY_ISO } from "./mock"

const REPEAT_OPTIONS: Array<{ value: TaskRepeat; label: string; icon: string }> = [
  { value: "none", label: "Uma vez", icon: "event" },
  { value: "daily", label: "Todo dia", icon: "calendar_view_day" },
  { value: "weekdays", label: "Dias úteis", icon: "work_history" },
  { value: "weekly", label: "Semanal", icon: "event_repeat" },
  { value: "custom", label: "Personalizar", icon: "tune" },
]

const WEEK_DAYS = [
  { value: 1, label: "S", title: "Segunda-feira" },
  { value: 2, label: "T", title: "Terça-feira" },
  { value: 3, label: "Q", title: "Quarta-feira" },
  { value: 4, label: "Q", title: "Quinta-feira" },
  { value: 5, label: "S", title: "Sexta-feira" },
  { value: 6, label: "S", title: "Sábado" },
  { value: 0, label: "D", title: "Domingo" },
]

const REMINDER_OPTIONS = [
  { value: 0, label: "Na hora" },
  { value: 10, label: "10 min antes" },
  { value: 30, label: "30 min antes" },
  { value: 60, label: "1 h antes" },
] as const

export interface ScheduledTaskInput {
  title: string
  time: string
  subtitle: string
  date: string
  repeat: TaskRepeat
  repeatDays: number[]
  repeatUntil?: string
  reminderMinutes?: number[]
  priority?: Priority
}

export function buildScheduledTask(input: ScheduledTaskInput, id = `task_${crypto.randomUUID()}`): Task {
  const startDay = new Date(`${input.date}T12:00:00`).getDay()
  const repeatDays = input.repeat === "custom"
    ? [...new Set(input.repeatDays)].sort((a, b) => a - b)
    : input.repeat === "weekdays"
      ? [1, 2, 3, 4, 5]
      : input.repeat === "weekly"
        ? [startDay]
        : input.repeat === "daily"
          ? [0, 1, 2, 3, 4, 5, 6]
          : []
  return {
    id,
    title: input.title.trim(),
    time: input.time,
    subtitle: input.subtitle.trim() || "Geral",
    category: input.subtitle.trim() || "Geral",
    date: input.date,
    completed: false,
    priority: input.priority,
    repeat: input.repeat,
    repeatDays,
    repeatUntil: input.repeat === "none" ? undefined : input.repeatUntil,
    completedDates: input.repeat === "none" ? undefined : [],
    reminderMinutes: [...new Set(input.reminderMinutes ?? [0])].sort((a, b) => a - b),
  }
}

interface TaskSchedulerFormProps {
  onClose: () => void
  task?: Task
}

export function TaskSchedulerForm({ onClose, task }: TaskSchedulerFormProps) {
  const app = useApp()
  const editing = Boolean(task)
  const [title, setTitle] = useState(task?.title ?? "")
  const [time, setTime] = useState(task?.time ?? "12:00")
  const [subtitle, setSubtitle] = useState(task?.subtitle ?? "Geral")
  const [priority, setPriority] = useState<Priority | "">(task?.priority ?? "")
  const [date, setDate] = useState(task?.date ?? TODAY_ISO)
  const [repeat, setRepeat] = useState<TaskRepeat>(task?.repeat ?? "none")
  const [repeatDays, setRepeatDays] = useState<number[]>(
    task?.repeatDays ?? [new Date(`${task?.date ?? TODAY_ISO}T12:00:00`).getDay()],
  )
  const [hasEndDate, setHasEndDate] = useState(Boolean(task?.repeatUntil))
  const [repeatUntil, setRepeatUntil] = useState(task?.repeatUntil ?? "")
  const [reminderMinutes, setReminderMinutes] = useState<number[]>(task?.reminderMinutes ?? [0])

  const repeatSummary = useMemo(() => {
    if (repeat === "none") return "A tarefa será criada somente para a data escolhida."
    if (repeat === "daily") return "Será exibida todos os dias, sempre no mesmo horário."
    if (repeat === "weekdays") return "Será exibida de segunda a sexta-feira."
    if (repeat === "weekly") return "Será repetida toda semana no dia da data inicial."
    const labels = WEEK_DAYS.filter((day) => repeatDays.includes(day.value)).map((day) => day.title.replace("-feira", ""))
    return labels.length ? `Será repetida em: ${labels.join(", ")}.` : "Escolha pelo menos um dia da semana."
  }, [repeat, repeatDays])

  const toggleDay = (day: number) => {
    setRepeatDays((current) => current.includes(day)
      ? current.filter((value) => value !== day)
      : [...current, day])
  }

  const toggleReminder = (minutes: number) => {
    setReminderMinutes((current) => current.includes(minutes)
      ? current.filter((value) => value !== minutes)
      : [...current, minutes])
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !date || reminderMinutes.length === 0 || (repeat === "custom" && repeatDays.length === 0)) return
    const next = buildScheduledTask({
      title,
      time,
      subtitle,
      date,
      repeat,
      repeatDays,
      repeatUntil: hasEndDate && repeatUntil ? repeatUntil : undefined,
      reminderMinutes,
      priority: priority || undefined,
    }, task?.id)

    app.setTasks((current) => editing
      ? current.map((entry) => entry.id === task?.id ? {
        ...next,
        completed: entry.completed,
        completedDates: next.repeat === "none" ? undefined : entry.completedDates,
        excludedDates: entry.excludedDates,
        paused: entry.paused,
        sourceScheduleId: entry.sourceScheduleId,
      } : entry)
      : [...current, next])
    onClose()
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-center gap-4 border-y border-outline-variant py-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon name="alarm" className="text-[26px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted">{editing ? "Editando agendamento" : "Novo agendamento"}</p>
          <p className="mt-0.5 font-mono text-2xl font-semibold text-on-surface">{time}</p>
        </div>
        <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          {REPEAT_OPTIONS.find((option) => option.value === repeat)?.label}
        </span>
      </div>

      <Input label="Título da tarefa" required placeholder="Ex.: Tomar medicamento" value={title} onChange={(event) => setTitle(event.target.value)} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Começa em" type="date" required min={editing ? undefined : TODAY_ISO} value={date} onChange={(event) => setDate(event.target.value)} />
        <Input label="Horário" type="time" required value={time} onChange={(event) => setTime(event.target.value)} fontFamily="mono" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Categoria" placeholder="Ex.: Saúde" value={subtitle} onChange={(event) => setSubtitle(event.target.value)} />
        <label className="flex flex-col gap-1.5 text-sm font-medium text-on-surface-variant">
          Prioridade
          <select value={priority} onChange={(event) => setPriority(event.target.value as Priority | "")} className="min-h-11 rounded-lg border border-outline-variant bg-surface-container px-3 text-sm font-normal text-on-surface outline-none focus:border-primary">
            <option value="">Sem prioridade</option>
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
          </select>
        </label>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-on-surface-variant">Repetição</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {REPEAT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={repeat === option.value}
              onClick={() => setRepeat(option.value)}
              className={cn(
                "level-control flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-center text-[11px] font-medium transition-colors motion-reduce:transition-none",
                repeat === option.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-outline-variant bg-surface-container text-muted hover:border-outline hover:text-on-surface",
              )}
            >
              <Icon name={option.icon} className="text-[19px]" />
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      {repeat === "custom" ? (
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-muted">Dias da semana</legend>
          <div className="flex justify-between gap-2">
            {WEEK_DAYS.map((day) => (
              <button
                key={day.value}
                type="button"
                title={day.title}
                aria-label={day.title}
                aria-pressed={repeatDays.includes(day.value)}
                onClick={() => toggleDay(day.value)}
                className={cn(
                  "level-control grid size-10 place-items-center rounded-full border font-mono text-xs font-semibold transition-colors motion-reduce:transition-none",
                  repeatDays.includes(day.value)
                    ? "border-primary bg-primary text-on-primary"
                    : "border-outline-variant text-muted hover:border-primary/60",
                )}
              >
                {day.label}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      {repeat !== "none" ? (
        <div className="space-y-3 border-t border-outline-variant pt-4">
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-medium text-on-surface">Definir data final</span>
              <span className="block text-xs text-muted">Desative para repetir sem prazo.</span>
            </span>
            <input type="checkbox" checked={hasEndDate} onChange={(event) => setHasEndDate(event.target.checked)} className="size-5 accent-primary" />
          </label>
          {hasEndDate ? <Input label="Repetir até" type="date" min={date} required value={repeatUntil} onChange={(event) => setRepeatUntil(event.target.value)} /> : null}
        </div>
      ) : null}

      <fieldset className="space-y-2 border-t border-outline-variant pt-4">
        <legend className="text-sm font-medium text-on-surface-variant">Lembretes</legend>
        <p className="text-xs text-muted">Escolha um ou mais avisos para esta tarefa.</p>
        <div className="flex flex-wrap gap-2">
          {REMINDER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={reminderMinutes.includes(option.value)}
              onClick={() => toggleReminder(option.value)}
              className={cn(
                "level-control min-h-10 rounded-lg border px-3 text-xs font-medium transition-colors motion-reduce:transition-none",
                reminderMinutes.includes(option.value)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-outline-variant text-muted hover:text-on-surface",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        {reminderMinutes.length === 0 ? <p role="alert" className="text-xs text-error">Selecione pelo menos um lembrete.</p> : null}
      </fieldset>

      <p className="flex items-start gap-2 rounded-lg bg-primary/[0.07] px-3 py-2.5 text-xs leading-5 text-on-surface-variant">
        <Icon name="notifications_active" className="mt-0.5 shrink-0 text-[17px] text-primary" />
        {repeatSummary} Cada dia pode ser concluído separadamente.
      </p>

      <div className="flex justify-end gap-2 border-t border-outline-variant pt-4">
        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={reminderMinutes.length === 0 || (repeat === "custom" && repeatDays.length === 0)}>
          <Icon name={editing ? "edit" : repeat === "none" ? "add_task" : "alarm_add"} className="text-[18px]" />
          {editing ? "Salvar alterações" : repeat === "none" ? "Salvar tarefa" : "Criar agendamento"}
        </Button>
      </div>
    </form>
  )
}
