import type { FinanceBootstrap } from "../finance/contracts"
import type { Task } from "../routine/contracts"
import type { TrainingSessionLog } from "../training/contracts"
import type { DietPlan } from "../nutrition/store"
import type { ProgressState } from "./contracts"
import { tasksOn } from "../routine/selectors"
import { formatCurrency } from "../../lib/format"

export type TimelineModule = "treinos" | "rotina" | "financeiro" | "alimentacao" | "progresso"
export interface TimelineEvent { id: string; date: string; module: TimelineModule; title: string; detail: string; href: string }
const DAY = 86_400_000
const plusDays = (iso: string, offset: number) => new Date(Date.parse(iso + "T12:00:00Z") + offset * DAY).toISOString().slice(0, 10)
const validDay = (date?: string | null): date is string => !!date && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date + "T12:00:00Z"))
export function crossModuleTimeline(data: {
  tasks: Task[]; sessions: TrainingSessionLog[]; finance: FinanceBootstrap
  nutrition: DietPlan | null; progress: ProgressState
}, today: string, limit = 12): TimelineEvent[] {
  if (!validDay(today)) return []
  const start = plusDays(today, -13)
  const output: TimelineEvent[] = []
  for (let i = 0; i < 14; i++) {
    const date = plusDays(start, i)
    for (const task of tasksOn(data.tasks, date, today).filter((item) => item.completed)) {
      output.push({ id: "routine-" + date + "-" + task.id, date, module: "rotina", title: "Tarefa concluída", detail: task.title, href: "/agenda" })
    }
  }
  for (const session of data.sessions) {
    if (!validDay(session.date) || session.date < start || session.date > today) continue
    const count = new Set(session.exercises.map((exercise) => exercise.name.trim().toLocaleLowerCase("pt-BR"))).size
    output.push({ id: "training-" + session.id, date: session.date, module: "treinos",
      title: "Treino registrado", detail: session.name + " · " + count + " movimento(s)", href: "/treinos" })
  }
  for (const expense of data.finance.expense_lines_v4) {
    if (!validDay(expense.date) || expense.date < start || expense.date > today) continue
    output.push({ id: "finance-" + expense.id, date: expense.date, module: "financeiro",
      title: "Despesa registrada", detail: (expense.label || "Lançamento") + " · " + formatCurrency(expense.value), href: "/financeiro?tab=extrato" })
  }
  const planDay = data.nutrition?.createdAt?.slice(0, 10)
  if (validDay(planDay) && planDay >= start && planDay <= today) {
    output.push({ id: "nutrition-" + (data.nutrition?.id ?? planDay), date: planDay, module: "alimentacao",
      title: "Plano alimentar ativo", detail: data.nutrition!.periodDays + " dia(s) · estimativa " + formatCurrency(data.nutrition!.estimatedCostBRL), href: "/alimentacao" })
  }
  for (const achievement of data.progress.achievements) {
    const date = achievement.unlocked_at?.slice(0, 10)
    if (!achievement.unlocked || !validDay(date) || date < start || date > today) continue
    output.push({ id: "progress-" + achievement.code, date, module: "progresso",
      title: "Conquista desbloqueada", detail: achievement.title, href: "/#progress" })
  }
  output.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
  const counters = new Map<TimelineModule, number>()
  return output.filter((entry) => {
    const count = counters.get(entry.module) ?? 0
    if (count >= 4) return false
    counters.set(entry.module, count + 1)
    return true
  }).slice(0, Math.max(0, Math.min(30, limit)))
}
