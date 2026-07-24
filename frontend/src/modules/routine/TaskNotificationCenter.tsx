import { useEffect, useMemo, useState } from "react"
import { Button } from "../../components/ui/Button"
import { Modal } from "../../components/ui/Modal"
import { useApp, type Task } from "../../context/AppContext"
import { Icon } from "../../design-system"
import { userStorageKey } from "../../lib/userStorage"
import { usePreferences } from "../preferences/store"
import { TODAY_ISO } from "./mock"
import { tasksOn } from "./selectors"

const NOTIFICATION_LOG_KEY = "level-os:task-notification-log:v1"
const DAY_MS = 86_400_000

const pad = (value: number) => String(value).padStart(2, "0")
const isoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

interface UpcomingTask {
  key: string
  task: Task
  date: string
  timestamp: number
}

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

function readNotificationLog(): Record<string, number> {
  try {
    const parsed = JSON.parse(localStorage.getItem(userStorageKey(NOTIFICATION_LOG_KEY)) ?? "{}")
    return parsed && typeof parsed === "object" ? parsed as Record<string, number> : {}
  } catch {
    return {}
  }
}

function writeNotificationLog(log: Record<string, number>) {
  try {
    const cutoff = Date.now() - 14 * DAY_MS
    const compact = Object.fromEntries(Object.entries(log).filter(([, timestamp]) => timestamp >= cutoff))
    localStorage.setItem(userStorageKey(NOTIFICATION_LOG_KEY), JSON.stringify(compact))
  } catch {
    // A central continua funcional mesmo quando o navegador bloqueia o storage.
  }
}

export function TaskNotificationCenter({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { tasks } = useApp()
  const { notifications } = usePreferences()
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  )
  const upcoming = useMemo(() => upcomingTasks(tasks), [tasks])

  useEffect(() => {
    if (!notifications.tasks || typeof Notification === "undefined" || Notification.permission !== "granted") return

    const check = () => {
      const now = Date.now()
      const log = readNotificationLog()
      let changed = false
      for (const item of upcomingTasks(tasks, new Date(), 2)) {
        for (const minutes of item.task.reminderMinutes ?? [0]) {
          const reminderAt = item.timestamp - minutes * 60_000
          const key = `${item.key}:r${minutes}`
          if (log[key] || reminderAt > now + 30_000 || reminderAt < now - 90_000) continue
          new Notification(item.task.title, {
            body: minutes === 0
              ? `${item.task.subtitle || "Tarefa"} · agora`
              : `${item.task.subtitle || "Tarefa"} · começa em ${minutes} min`,
            tag: key,
            icon: "/favicon.svg",
          })
          log[key] = now
          changed = true
        }
      }
      if (changed) writeNotificationLog(log)
    }

    check()
    const interval = window.setInterval(check, 30_000)
    return () => window.clearInterval(interval)
  }, [notifications.tasks, tasks])

  const requestPermission = async () => {
    if (typeof Notification === "undefined") return
    const result = await Notification.requestPermission()
    setPermission(result)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Notificações" description="Próximas tarefas e lembretes da sua rotina." icon="notifications" maxWidth="max-w-lg">
      <div className="space-y-5">
        {permission !== "granted" ? (
          <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container p-4 sm:flex-row sm:items-center">
            <Icon name="notifications_active" className="text-[22px] text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-on-surface">Ative os avisos do navegador</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                {permission === "denied"
                  ? "A permissão está bloqueada. Libere as notificações nas configurações do navegador."
                  : permission === "unsupported"
                    ? "Este navegador não oferece notificações locais."
                    : "O Level OS só solicitará permissão quando você confirmar."}
              </p>
            </div>
            {permission === "default" ? <Button variant="secondary" onClick={() => void requestPermission()}>Ativar</Button> : null}
          </div>
        ) : (
          <p className="flex items-center gap-2 text-xs text-tertiary">
            <Icon name="check_circle" filled className="text-[16px]" /> Avisos do navegador ativos
          </p>
        )}

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-on-surface">Próximos 7 dias</h3>
            <span className="font-mono text-xs text-muted">{upcoming.length}</span>
          </div>
          {upcoming.length === 0 ? (
            <div className="border-y border-outline-variant py-8 text-center">
              <Icon name="event_available" className="text-[26px] text-muted" />
              <p className="mt-2 text-sm text-muted">Nenhuma tarefa programada.</p>
            </div>
          ) : (
            <ul className="divide-y divide-outline-variant border-y border-outline-variant">
              {upcoming.slice(0, 20).map((item) => (
                <li key={item.key} className="flex min-h-14 items-center gap-3 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon name={item.task.repeat && item.task.repeat !== "none" ? "event_repeat" : "event"} className="text-[17px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-on-surface">{item.task.title}</span>
                    <span className="block truncate text-xs text-muted">{item.task.subtitle || "Geral"}</span>
                  </span>
                  <time dateTime={`${item.date}T${item.task.time}`} className="shrink-0 text-right font-mono text-xs text-muted">
                    <span className="block">{item.date === TODAY_ISO ? "Hoje" : item.date.slice(5).split("-").reverse().join("/")}</span>
                    <span className="block text-on-surface">{item.task.time}</span>
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Modal>
  )
}
