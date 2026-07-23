export type ProgressEventType = "rotina" | "treino"
export type ProgressCategory = "rotina" | "treino" | "financeiro" | "consistencia" | "nivel" | "xp" | "geral"

export interface Achievement {
  code: string
  title: string
  description: string
  xp_bonus: number
  icon: string
  unlocked: boolean
  unlocked_at: string | null
  category: ProgressCategory
  current: number
  goal: number
}

export interface ProgressFeedback {
  id: number
  type: ProgressEventType | "financeiro"
  delta: number
  unlocked: Achievement[]
}

export interface ProgressState {
  level: number
  title: string
  xp: number
  xp_into_level: number
  xp_to_next: number
  progress_pct: number
  streak: number
  achievements: Achievement[]
  updated_at: string | null
}

export interface ProgressEventResult {
  state: ProgressState
  delta: number
  level_up: boolean
  duplicate: boolean
  unlocked: Achievement[]
}
