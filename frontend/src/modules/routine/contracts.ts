/**
 * Modelos de domínio da Rotina.
 *
 * ATENÇÃO: estes NÃO são contratos de backend. Reproduzem os view models do
 * frontend existente (frontend/src/context/AppContext.tsx) e servem para o
 * preview até que exista wiring com `api/data.php` (chaves `tasks_v6`/
 * `checklist_v6`). Campos novos são opcionais → não quebram usos existentes.
 */

export type Priority = "alta" | "media" | "baixa"
export type TaskRepeat = "none" | "daily" | "weekdays" | "weekly" | "custom"

export interface Task {
  id: string
  time: string
  title: string
  subtitle: string
  completed: boolean
  /** Data ISO (YYYY-MM-DD). Ausente = tarefa "de hoje" (compat. legado). */
  date?: string
  priority?: Priority
  category?: string
  durationMin?: number
  /** Repetição do agendamento. Ausente equivale a `none` para compatibilidade. */
  repeat?: TaskRepeat
  /** Dias da semana no padrão JavaScript: 0=domingo ... 6=sábado. */
  repeatDays?: number[]
  /** Data final inclusiva. Ausente = sem data final. */
  repeatUntil?: string
  /** Ocorrências concluídas de uma tarefa recorrente. */
  completedDates?: string[]
}
