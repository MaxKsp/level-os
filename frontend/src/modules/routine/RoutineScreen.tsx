import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "../../components/ui/Button"
import { useAssistant } from "../assistant/store"
import { AssistantAvatar } from "../assistant/AssistantAvatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Icon, SectionCard } from "../../design-system"
import { cn } from "../../lib/cn"
import { useApp } from "../../context/AppContext"
import type { Task } from "../../context/AppContext"
import { TODAY_ISO } from "./mock"
import { PRIORITY_LABEL, PRIORITY_TONE, progressPercent, tasksOn } from "./selectors"
import type { CalendarView, GoogleCalendarConnection, GoogleCalendarEvent } from "../calendar/contracts"
import { useCalendarRange } from "../calendar/store"
import {
  calendarRangeForView,
  countTimelineByDate,
  googleEventTimeLabel,
  safeGoogleCalendarUrl,
  timelineOnDate,
  type TimelineItem,
} from "../calendar/selectors"

type View = CalendarView
const VIEWS: { key: View; label: string }[] = [
  { key: "dia", label: "Dia" },
  { key: "semana", label: "Semana" },
  { key: "mes", label: "Mês" },
  { key: "ano", label: "Ano" },
]

const WD = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
const MES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
const MES_ABBR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

const pad = (n: number) => String(n).padStart(2, "0")
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parseISO = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d) }
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r }
/** Segunda-feira da semana que contém `d`. */
const weekStart = (d: Date) => addDays(d, -((d.getDay() + 6) % 7))

export function RoutineScreen() {
  const { tasks, handleToggleTask, setIsTaskModalOpen } = useApp()
  const assistant = useAssistant()
  const [view, setView] = useState<View>("dia")
  const [cursor, setCursor] = useState<Date>(parseISO(TODAY_ISO))
  const toggle = handleToggleTask

  const range = useMemo(() => calendarRangeForView(view, cursor), [cursor, view])
  const calendar = useCalendarRange(range)
  const counts = useMemo(
    () => countTimelineByDate(tasks, calendar.events, TODAY_ISO),
    [calendar.events, tasks],
  )
  const isToday = (d: Date) => isoOf(d) === TODAY_ISO

  return (
    <main className="level-page mx-auto flex max-w-[1100px] flex-col gap-6 px-4 pb-24 pt-24 sm:px-6">
      <header className="level-page-header flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="level-page-title text-3xl font-semibold tracking-tight text-on-surface">Rotina</h1>
          <p className="mt-2 text-on-surface-variant">Agenda por dia, semana, mês e ano.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="md" onClick={() => assistant.openFor("agenda")}>
            <AssistantAvatar module="agenda" className="size-4" /> Secretária Nina
          </Button>
          <Button variant="primary" size="md" onClick={() => setIsTaskModalOpen(true)}>
            <Icon name="add" className="text-[18px]" /> Nova tarefa
          </Button>
        </div>
      </header>

      <Tabs value={view} onValueChange={(value) => setView(value as View)} className="w-full max-w-sm">
        <TabsList variant="line" aria-label="Visualização da rotina" className="w-full">
          {VIEWS.map((item) => <TabsTrigger key={item.key} value={item.key} onClick={() => setView(item.key)}>{item.label}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      <CalendarNotice
        connection={calendar.connection}
        connectionStatus={calendar.connectionStatus}
        status={calendar.status}
        error={calendar.error}
        retry={calendar.retry}
      />

      {view === "dia" && <DiaView date={cursor} setDate={setCursor} tasks={tasks} events={calendar.events} toggle={toggle} isToday={isToday} />}
      {view === "semana" && <SemanaView cursor={cursor} setCursor={setCursor} tasks={tasks} events={calendar.events} toggle={toggle} isToday={isToday} />}
      {view === "mes" && <MesView cursor={cursor} setCursor={setCursor} counts={counts} tasks={tasks} events={calendar.events} toggle={toggle} isToday={isToday} onOpenDay={(d) => { setCursor(d); setView("dia") }} />}
      {view === "ano" && <AnoView cursor={cursor} setCursor={setCursor} counts={counts} onOpenMonth={(d) => { setCursor(d); setView("mes") }} />}
    </main>
  )
}

/* ------------------------------------------------------------------ Dia */
function DiaView({ date, setDate, tasks, events, toggle, isToday }: { date: Date; setDate: (d: Date) => void; tasks: Task[]; events: GoogleCalendarEvent[]; toggle: (id: string) => void; isToday: (d: Date) => boolean }) {
  const dayTasks = tasksOn(tasks, isoOf(date), TODAY_ISO)
  const items = timelineOnDate(tasks, events, isoOf(date), TODAY_ISO)
  const done = dayTasks.filter((t) => t.completed).length
  const googleCount = items.filter((item) => item.source === "google").length
  const pct = progressPercent(done, dayTasks.length)
  const label = date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })

  return (
    <div className="flex flex-col gap-4">
      <PeriodNav
        title={label.charAt(0).toUpperCase() + label.slice(1)}
        onPrev={() => setDate(addDays(date, -1))}
        onNext={() => setDate(addDays(date, 1))}
        onToday={() => setDate(parseISO(TODAY_ISO))}
        badge={isToday(date) ? "Hoje" : undefined}
      />
      <SectionCard title="Tarefas do dia" description={`${done} de ${dayTasks.length} concluídas${googleCount ? ` · ${googleCount} do Google` : ""}`} bodyClassName="p-0"
        action={<div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-container-highest"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>}>
        {items.length === 0 ? (
          <Empty label="Nenhuma tarefa ou evento neste dia." />
        ) : (
          <ul className="divide-y divide-outline-variant">
            {items.map((item) => <li key={item.key}><TimelineRow item={item} toggle={toggle} /></li>)}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}

/* --------------------------------------------------------------- Semana */
function SemanaView({ cursor, setCursor, tasks, events, toggle, isToday }: { cursor: Date; setCursor: (d: Date) => void; tasks: Task[]; events: GoogleCalendarEvent[]; toggle: (id: string) => void; isToday: (d: Date) => boolean }) {
  const start = weekStart(cursor)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const end = addDays(start, 6)
  const title = `${start.getDate()} ${MES_ABBR[start.getMonth()]} – ${end.getDate()} ${MES_ABBR[end.getMonth()]}`

  return (
    <div className="flex flex-col gap-4">
      <PeriodNav title={title} onPrev={() => setCursor(addDays(cursor, -7))} onNext={() => setCursor(addDays(cursor, 7))} onToday={() => setCursor(parseISO(TODAY_ISO))} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {days.map((d) => {
          const list = timelineOnDate(tasks, events, isoOf(d), TODAY_ISO)
          const today = isToday(d)
          return (
            <div key={isoOf(d)} className={cn("rounded-xl border p-2", today ? "border-primary bg-primary/5" : "border-outline-variant bg-surface-container-low")}>
              <div className="mb-2 px-1">
                <p className={cn("text-xs font-medium uppercase", today ? "text-primary" : "text-muted")}>{WD[(d.getDay() + 6) % 7]}</p>
                <p className={cn("font-mono text-lg font-semibold", today ? "text-primary" : "text-on-surface")}>{d.getDate()}</p>
              </div>
              <ul className="flex flex-col gap-1">
                {list.length === 0 ? <li className="px-1 py-1 text-xs text-muted">—</li> : list.map((item) => (
                  <li key={item.key}>
                    <WeekTimelineItem item={item} toggle={toggle} />
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ Mês */
function MesView({ cursor, setCursor, counts, tasks, events, toggle, isToday, onOpenDay }: { cursor: Date; setCursor: (d: Date) => void; counts: Map<string, number>; tasks: Task[]; events: GoogleCalendarEvent[]; toggle: (id: string) => void; isToday: (d: Date) => boolean; onOpenDay: (d: Date) => void }) {
  const [sel, setSel] = useState<Date>(cursor)
  const y = cursor.getFullYear(), m = cursor.getMonth()
  const first = new Date(y, m, 1)
  const gridStart = weekStart(first)
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const selectedTasks = tasksOn(tasks, isoOf(sel), TODAY_ISO)
  const selectedItems = timelineOnDate(tasks, events, isoOf(sel), TODAY_ISO)
  const selectedGoogle = selectedItems.filter((item) => item.source === "google").length

  return (
    <div className="flex flex-col gap-4">
      <PeriodNav title={`${MES[m]} ${y}`} onPrev={() => setCursor(new Date(y, m - 1, 1))} onNext={() => setCursor(new Date(y, m + 1, 1))} onToday={() => setCursor(parseISO(TODAY_ISO))} />
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-3 sm:p-4">
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase text-muted">
            {WD.map((w) => <div key={w}>{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d) => {
              const inMonth = d.getMonth() === m
              const n = counts.get(isoOf(d)) ?? 0
              const selected = isoOf(d) === isoOf(sel)
              return (
                <button key={isoOf(d)} onClick={() => setSel(d)} onDoubleClick={() => onOpenDay(d)}
                  className={cn(
                    "level-control flex aspect-square flex-col items-center justify-center gap-1 rounded-lg text-sm transition-colors",
                    !inMonth && "opacity-35",
                    selected ? "bg-primary/15 ring-1 ring-primary" : "hover:bg-surface-container",
                    isToday(d) && !selected && "ring-1 ring-outline",
                  )}>
                  <span className={cn("font-mono", isToday(d) ? "font-semibold text-primary" : "text-on-surface")}>{d.getDate()}</span>
                  {n > 0 ? <span className={cn("h-1.5 rounded-full bg-primary", n >= 3 ? "w-4" : n === 2 ? "w-2.5" : "w-1.5")} /> : <span className="h-1.5" />}
                </button>
              )
            })}
          </div>
        </div>
        <SectionCard title={sel.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })} description={`${selectedTasks.filter((t) => t.completed).length}/${selectedTasks.length} concluídas${selectedGoogle ? ` · ${selectedGoogle} do Google` : ""}`} bodyClassName="p-0">
          {selectedItems.length === 0 ? <Empty label="Sem tarefas ou eventos neste dia." /> : (
            <ul className="divide-y divide-outline-variant">{selectedItems.map((item) => <li key={item.key}><TimelineRow item={item} toggle={toggle} /></li>)}</ul>
          )}
        </SectionCard>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ Ano */
function AnoView({ cursor, setCursor, counts, onOpenMonth }: { cursor: Date; setCursor: (d: Date) => void; counts: Map<string, number>; onOpenMonth: (d: Date) => void }) {
  const y = cursor.getFullYear()
  const total = Array.from(counts.entries()).filter(([k]) => k.startsWith(`${y}-`)).reduce((s, [, n]) => s + n, 0)
  return (
    <div className="flex flex-col gap-4">
      <PeriodNav title={`${y}`} onPrev={() => setCursor(new Date(y - 1, 0, 1))} onNext={() => setCursor(new Date(y + 1, 0, 1))} onToday={() => setCursor(parseISO(TODAY_ISO))} badge={`${total} itens`} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {MES.map((name, mi) => {
          const days = new Date(y, mi + 1, 0).getDate()
          const first = new Date(y, mi, 1)
          const gridStart = weekStart(first)
          const monthCount = Array.from({ length: days }, (_, i) => counts.get(isoOf(new Date(y, mi, i + 1))) ?? 0).reduce((a, b) => a + b, 0)
          return (
            <button key={mi} onClick={() => onOpenMonth(new Date(y, mi, 1))} className="level-control rounded-xl border border-outline-variant bg-surface-container-low p-3 text-left transition-colors hover:border-outline hover:bg-surface-container">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-sm font-medium text-on-surface">{name}</span>
                <span className="font-mono text-xs text-muted">{monthCount}</span>
              </div>
              <div className="grid grid-cols-7 gap-[3px]">
                {Array.from({ length: 42 }, (_, i) => {
                  const d = addDays(gridStart, i)
                  if (d.getMonth() !== mi) return <span key={i} className="aspect-square" />
                  const n = counts.get(isoOf(d)) ?? 0
                  const op = n === 0 ? 0.08 : Math.min(1, 0.25 + n * 0.25)
                  return <span key={i} className="aspect-square rounded-[2px] bg-primary" style={{ opacity: op }} />
                })}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- primitivos */
function CalendarNotice({ connection, connectionStatus, status, error, retry }: {
  connection: GoogleCalendarConnection
  connectionStatus: "idle" | "loading" | "ready" | "error"
  status: "idle" | "loading" | "ready" | "error"
  error: string | null
  retry: () => Promise<void>
}) {
  if (connection.status === "reconnect_required") {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-y border-warning/25 bg-warning/[0.06] px-3 py-2.5 text-sm text-on-surface-variant">
        <span className="flex items-center gap-2"><Icon name="cloud_off" className="text-[17px] text-warning" />A autorização do Google Calendar expirou.</span>
        <Link to="/perfil#integrations" className="font-medium text-warning underline-offset-2 hover:underline">Reconectar</Link>
      </div>
    )
  }
  if (status === "error") {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-y border-error/20 bg-error/[0.05] px-3 py-2.5 text-sm text-on-surface-variant">
        <span>{error || "Não foi possível atualizar os eventos do Google."}</span>
        <button type="button" onClick={() => void retry()} className="level-control font-medium text-primary underline-offset-2 hover:underline">Tentar novamente</button>
      </div>
    )
  }
  if (connectionStatus === "idle" || connectionStatus === "loading" || status === "loading") {
    return <p role="status" className="flex items-center gap-2 text-xs text-muted"><Icon name="calendar_month" className="text-[15px] text-primary" />Atualizando Google Calendar…</p>
  }
  if (connection.status === "disconnected") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-outline-variant px-1 py-3 text-sm text-muted">
        <span>Conecte o Google Calendar para ver compromissos junto das tarefas.</span>
        <Link to="/perfil#integrations" className="font-medium text-primary underline-offset-2 hover:underline">Configurar no perfil</Link>
      </div>
    )
  }
  return null
}

function TimelineRow({ item, toggle }: { item: TimelineItem; toggle: (id: string) => void }) {
  return item.source === "level"
    ? <TaskRow task={item.task} toggle={toggle} showTime />
    : <GoogleEventRow event={item.event} />
}

function GoogleEventRow({ event }: { event: GoogleCalendarEvent }) {
  const link = safeGoogleCalendarUrl(event.htmlLink)
  const content = (
    <>
      <Icon name="calendar_month" className="text-[20px] text-primary" />
      <span className="w-20 shrink-0 font-mono text-xs text-muted">{googleEventTimeLabel(event)}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-on-surface">{event.title}</span>
        <span className="block truncate text-xs text-muted">Google Calendar{event.location ? ` · ${event.location}` : ""}</span>
      </span>
      <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Google</span>
      {link ? <Icon name="arrow_forward" className="text-[15px] text-muted" /> : null}
    </>
  )
  return link ? (
    <a href={link} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${event.title} no Google Calendar`} className="level-row-action flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-surface-container">
      {content}
    </a>
  ) : (
    <div className="flex w-full items-center gap-3 px-5 py-3 text-left">{content}</div>
  )
}

function WeekTimelineItem({ item, toggle }: { item: TimelineItem; toggle: (id: string) => void }) {
  if (item.source === "level") {
    const task = item.task
    return (
      <button onClick={() => toggle(task.id)} className="level-control flex w-full items-start gap-1.5 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-surface-container">
        <Icon name={task.completed ? "check_circle" : "radio_button_unchecked"} filled={task.completed} className={cn("mt-0.5 text-[15px]", task.completed ? "text-tertiary" : "text-muted")} />
        <span className={cn("text-xs leading-tight", task.completed ? "text-muted line-through" : "text-on-surface")}>{task.title}</span>
      </button>
    )
  }
  const link = safeGoogleCalendarUrl(item.event.htmlLink)
  const content = <><Icon name="calendar_month" className="mt-0.5 text-[14px] text-primary" /><span className="min-w-0"><span className="block truncate text-xs leading-tight text-on-surface">{item.event.title}</span><span className="block truncate text-[10px] text-primary">{googleEventTimeLabel(item.event)}</span></span></>
  return link ? (
    <a href={link} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${item.event.title} no Google Calendar`} className="level-control flex w-full items-start gap-1.5 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-surface-container">{content}</a>
  ) : (
    <div className="flex w-full items-start gap-1.5 px-1.5 py-1 text-left">{content}</div>
  )
}

function PeriodNav({ title, onPrev, onNext, onToday, badge }: { title: string; onPrev: () => void; onNext: () => void; onToday: () => void; badge?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-on-surface">{title}</h2>
        {badge ? <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">{badge}</span> : null}
      </div>
      <div className="flex items-center gap-1">
        <button onClick={onToday} className="level-control mr-1 rounded-lg border border-outline-variant px-2.5 py-1.5 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container">Hoje</button>
        <button onClick={onPrev} aria-label="Anterior" className="level-icon-button grid h-8 w-8 place-items-center rounded-lg border border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-container"><Icon name="chevron_left" className="text-[20px]" /></button>
        <button onClick={onNext} aria-label="Próximo" className="level-icon-button grid h-8 w-8 place-items-center rounded-lg border border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-container"><Icon name="chevron_right" className="text-[20px]" /></button>
      </div>
    </div>
  )
}

function TaskRow({ task, toggle, showTime }: { task: Task; toggle: (id: string) => void; showTime?: boolean }) {
  return (
    <button onClick={() => toggle(task.id)} className="level-row-action flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-surface-container">
      <Icon name={task.completed ? "check_circle" : "radio_button_unchecked"} filled={task.completed} className={cn("text-[20px]", task.completed ? "text-tertiary" : "text-muted")} />
      {showTime ? <span className="w-12 shrink-0 font-mono text-xs text-muted">{task.time}</span> : null}
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm", task.completed ? "text-muted line-through" : "text-on-surface")}>{task.title}</p>
        <p className="truncate text-xs text-muted">{task.subtitle}{task.durationMin ? ` · ${task.durationMin} min` : ""}</p>
      </div>
      {task.priority ? <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium", PRIORITY_TONE[task.priority])}>{PRIORITY_LABEL[task.priority]}</span> : null}
    </button>
  )
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
      <Icon name="event_available" className="text-[28px] text-muted" />
      <p className="text-sm text-muted">{label}</p>
    </div>
  )
}
