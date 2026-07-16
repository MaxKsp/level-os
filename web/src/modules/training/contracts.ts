/**
 * Modelos de domínio do Treino.
 *
 * ATENÇÃO: NÃO são contratos de backend (ver módulo Rotina). Reproduzem os
 * view models do frontend existente para uso no preview.
 */

export interface Exercise {
  id: string
  name: string
  sets: string
  completed: boolean
}

export interface WorkoutSession {
  title: string
  focus: string
  durationMin: number
  exercises: Exercise[]
}

export interface WeightRecord {
  date: string
  weight: number
}
