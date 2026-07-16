import type { Task } from "./contracts"

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
  const nextTask = tasks.find((t) => !t.completed) ?? null
  return {
    total: tasks.length,
    completed,
    pending: tasks.length - completed,
    progress: progressPercent(completed, tasks.length),
    nextTask,
  }
}
