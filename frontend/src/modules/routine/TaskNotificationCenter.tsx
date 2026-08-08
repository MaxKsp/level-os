import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "../../components/ui/Button"
import { Modal } from "../../components/ui/Modal"
import { EmptyState, Icon } from "../../design-system"
import { useApp, type Task } from "../../context/AppContext"
import { formatCurrency } from "../../lib/format"
import { userStorageKey } from "../../lib/userStorage"
import { financeInsights } from "../finance/financeInsights"
import { useFinance } from "../finance/store"
import { usePreferences } from "../preferences/store"
import { useTraining } from "../training/store"
import { TODAY_ISO } from "./mock"
import { tasksOn } from "./selectors"

const NOTIFICATION_LOG_KEY = "level-os:task-notification-log:v1"
const READ_KEY = "level-os:notification-read:v1"
const DAY_MS = 86_400_000
const pad = (value: number) => String(value).padStart(2, "0")
const isoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

interface UpcomingTask { key: string; task: Task; date: string; timestamp: number }
interface InboxItem { id: string; title: string; detail: string; icon: string; date: string; to: string; tone?: "warning" | "positive" }

function upcomingTasks(tasks: Task[], now = new Date(), days = 7): UpcomingTask[] {
  const result: UpcomingTask[] = []
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
    const dateIso = isoDate(date)
    for (const task of tasksOn(tasks, dateIso, TODAY_ISO)) {
      const timestamp = new Date(`${dateIso}T${task.time}:00`).getTime()
      if (!Number.isFinite(timestamp) || timestamp < now.getTime() - 60_000) continue
      result.push({ key: `${task.id}:${dateIso}`, task, date: dateIso, timestamp })
    }
  }
  return result.sort((a, b) => a.timestamp - b.timestamp)
}

function readJsonRecord(key: string): Record<string, number> {
  try {
    const parsed = JSON.parse(localStorage.getItem(userStorageKey(key)) ?? "{}")
    return parsed && typeof parsed === "object" ? parsed as Record<string, number> : {}
  } catch { return {} }
}

function writeJsonRecord(key: string, value: Record<string, number>, maxAgeDays = 60) {
  try {
    const cutoff = Date.now() - maxAgeDays * DAY_MS
    localStorage.setItem(userStorageKey(key), JSON.stringify(Object.fromEntries(Object.entries(value).filter(([, timestamp]) => timestamp >= cutoff))))
  } catch { /* A central continua funcional quando o storage é bloqueado. */ }
}

function nextDueDate(day: number, now = new Date()): Date {
  const candidate = new Date(now.getFullYear(), now.getMonth(), day)
  if (candidate.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) candidate.setMonth(candidate.getMonth() + 1)
  return candidate
}

export function TaskNotificationCenter({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { tasks } = useApp()
  const finance = useFinance()
  const training = useTraining()
  const { notifications } = usePreferences()
  const navigate = useNavigate()
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(typeof Notification === "undefined" ? "unsupported" : Notification.permission)
  const [read, setRead] = useState(() => readJsonRecord(READ_KEY))
  const now = useMemo(() => new Date(), [isOpen])

  const items = useMemo<InboxItem[]>(() => {
    const taskItems = upcomingTasks(tasks, now, 7).slice(0, 12).map((item) => ({
      id: `task:${item.key}`,
      title: item.task.title,
      detail: `${item.task.subtitle || "Tarefa"} · ${item.task.time}`,
      icon: item.task.repeat && item.task.repeat !== "none" ? "event_repeat" : "event",
      date: item.date,
      to: "/agenda",
    }))
    const overdue = tasks.filter((task) => !task.completed && task.date && task.date < TODAY_ISO).slice(0, 4).map((task) => ({
      id: `overdue:${task.id}:${task.date}`,
      title: `Tarefa atrasada: ${task.title}`,
      detail: `${task.subtitle || "Rotina"} · prevista para ${task.date?.split("-").reverse().join("/")}`,
      icon: "event_busy", date: task.date ?? TODAY_ISO, to: "/agenda", tone: "warning" as const,
    }))
    const dueCards = finance.accounts.filter((account) => account.tipo === "cartao" && account.vencimento && account.fatura > 0).flatMap((account) => {
      const due = nextDueDate(account.vencimento as number, now)
      const days = Math.ceil((due.getTime() - now.getTime()) / DAY_MS)
      return days <= 7 ? [{ id: `card:${account.id}:${isoDate(due)}`, title: `Fatura próxima do vencimento`, detail: `${account.label} · ${formatCurrency(account.fatura)} · vence em ${Math.max(0, days)} dia(s)`, icon: "credit_card", date: isoDate(due), to: "/financeiro?tab=contas", tone: "warning" as const }] : []
    })
    const insights = financeInsights(finance.bootstrap, now).map((insight) => ({ id: `insight:${insight.id}:${now.toISOString().slice(0, 7)}`, title: insight.title, detail: insight.detail, icon: insight.icon, date: TODAY_ISO, to: "/financeiro?tab=dash", tone: insight.tone === "warning" ? "warning" as const : undefined }))
    const trainedToday = training.sessions.some((session) => session.date === TODAY_ISO)
    const workout = training.workouts.length && !trainedToday ? [{ id: `workout:${TODAY_ISO}`, title: "Treino disponível", detail: `${training.workouts[0]?.name ?? "Seu treino"} está pronto para hoje.`, icon: "fitness_center", date: TODAY_ISO, to: "/treinos", tone: "positive" as const }] : []
    return [...overdue, ...dueCards, ...insights, ...workout, ...taskItems]
  }, [finance.accounts, finance.bootstrap, now, tasks, training.sessions, training.workouts])

  useEffect(() => {
    if (!notifications.tasks || typeof Notification === "undefined" || Notification.permission !== "granted") return
    const check = () => {
      const timestamp = Date.now()
      const log = readJsonRecord(NOTIFICATION_LOG_KEY)
      let changed = false
      for (const item of upcomingTasks(tasks, new Date(), 2)) {
        for (const minutes of item.task.reminderMinutes ?? [0]) {
          const reminderAt = item.timestamp - minutes * 60_000
          const key = `${item.key}:r${minutes}`
          if (log[key] || reminderAt > timestamp + 30_000 || reminderAt < timestamp - 90_000) continue
          new Notification(item.task.title, { body: minutes === 0 ? `${item.task.subtitle || "Tarefa"} · agora` : `${item.task.subtitle || "Tarefa"} · começa em ${minutes} min`, tag: key, icon: "/favicon.svg" })
          log[key] = timestamp
          changed = true
        }
      }
      if (changed) writeJsonRecord(NOTIFICATION_LOG_KEY, log, 14)
    }
    check()
    const interval = window.setInterval(check, 30_000)
    return () => window.clearInterval(interval)
  }, [notifications.tasks, tasks])

  const requestPermission = async () => {
    if (typeof Notification === "undefined") return
    setPermission(await Notification.requestPermission())
  }
  const markRead = (id: string) => {
    const next = { ...read, [id]: Date.now() }
    setRead(next)
    writeJsonRecord(READ_KEY, next)
  }
  const openItem = (item: InboxItem) => { markRead(item.id); onClose(); navigate(item.to) }
  const markAllRead = () => {
    const timestamp = Date.now()
    const next = { ...read, ...Object.fromEntries(items.map((item) => [item.id, timestamp])) }
    setRead(next)
    writeJsonRecord(READ_KEY, next)
  }
  const groups = [
    ["Hoje", items.filter((item) => item.date === TODAY_ISO)],
    ["Esta semana", items.filter((item) => item.date > TODAY_ISO)],
    ["Anteriores", items.filter((item) => item.date < TODAY_ISO)],
  ] as const
  const unread = items.filter((item) => !read[item.id]).length

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Central de notificações" description={`${unread} não lida(s) · ações da sua semana.`} icon="notifications" maxWidth="max-w-lg">
      <div className="space-y-5">
        {permission !== "granted" ? <div className="flex items-center gap-3 border-y border-outline-variant py-3"><Icon name="notifications_active" className="text-[22px] text-primary" /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-on-surface">Avisos do navegador</p><p className="mt-1 text-xs leading-5 text-muted">{permission === "denied" ? "Libere nas configurações do navegador." : permission === "unsupported" ? "Este navegador não oferece avisos locais." : "Ative apenas se quiser receber lembretes fora desta central."}</p></div>{permission === "default" ? <Button variant="secondary" size="sm" onClick={() => void requestPermission()}>Ativar</Button> : null}</div> : null}
        <div className="flex items-center justify-between"><p className="text-xs text-muted">{items.length} alertas e lembretes</p>{unread ? <Button variant="ghost" size="sm" onClick={markAllRead}>Marcar todas como lidas</Button> : null}</div>
        {items.length === 0 ? <EmptyState title="Tudo em dia" description="Novos alertas financeiros, tarefas e treinos aparecerão aqui." icon="notifications_none" /> : groups.map(([label, group]) => group.length ? <section key={label}><h3 className="mb-1 text-xs font-medium text-muted">{label}</h3><ul className="divide-y divide-outline-variant border-y border-outline-variant">{group.map((item) => <li key={item.id}><button type="button" onClick={() => openItem(item)} className="level-row-action flex min-h-16 w-full items-center gap-3 py-3 text-left"><span className={`grid size-9 shrink-0 place-items-center rounded-lg ${item.tone === "warning" ? "bg-error/10 text-error" : item.tone === "positive" ? "bg-tertiary/10 text-tertiary" : "bg-primary/10 text-primary"}`}><Icon name={item.icon} className="text-[17px]" /></span><span className="min-w-0 flex-1"><span className={`block truncate text-sm font-medium ${read[item.id] ? "text-muted" : "text-on-surface"}`}>{item.title}</span><span className="block line-clamp-2 text-xs text-muted">{item.detail}</span></span>{!read[item.id] ? <span className="size-2 rounded-full bg-primary" aria-label="Não lida" /> : null}<Icon name="chevron_right" className="text-[16px] text-muted" /></button></li>)}</ul></section> : null)}
      </div>
    </Modal>
  )
}
