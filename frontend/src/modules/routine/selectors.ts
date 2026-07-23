import type { Priority, Task } from "./contracts"

export function progressPercent(completed: number, total: number): number {
  return total > 0 ? Math.round((completed / total) * 100) : 0
}

export interface RoutineSummary {
  total: number
  completed: number
  pending: number
  progress: number
  nextTask: Task | null
}

export function routineSummary(tasks: Task[]): RoutineSummary {
  const completed = tasks.filter((t) => t.completed).length
  const sorted = [...tasks].sort((a, b) => a.time.localeCompare(b.time))
  const nextTask = sorted.find((t) => !t.completed) ?? null
  return {
    total: tasks.length,
    completed,
    pending: tasks.length - completed,
    progress: progressPercent(completed, tasks.length),
    nextTask,
  }
}

/** Tarefas de uma data ISO (trata data ausente como `fallbackIso`). */
export function tasksOn(tasks: Task[], isoDate: string, fallbackIso?: string): Task[] {
  return tasks
    .filter((t) => (t.date ?? fallbackIso) === isoDate)
    .sort((a, b) => a.time.localeCompare(b.time))
}

/** Contagem de tarefas por dia ISO — base de indicadores de calendário/heatmap. */
export function countByDate(tasks: Task[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const t of tasks) {
    if (!t.date) continue
    m.set(t.date, (m.get(t.date) ?? 0) + 1)
  }
  return m
}

export const PRIORITY_TONE: Record<Priority, string> = {
  alta: "bg-error/15 text-error",
  media: "bg-warning/15 text-warning",
  baixa: "bg-tertiary/15 text-tertiary",
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
}
