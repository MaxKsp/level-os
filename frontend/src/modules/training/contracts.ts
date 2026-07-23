export type TrainingModality = "forca" | "cardio" | "calistenia" | "mobilidade"
export type MeasurementType = "peso" | "gordura" | "altura" | "cintura" | "quadril" | "braco" | "coxa" | "peito" | "panturrilha"
export type MeasurementUnit = "kg" | "%" | "cm"

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

export interface WeightRecord { date: string; weight: number }

export interface WorkoutExercise {
  id: string
  name: string
  modality?: TrainingModality
  sets: string | number | null
  reps: string | number | null
  loadKg?: number | null
  restSec?: number | null
  durationSec?: number | null
  progressionLevel?: string | null
  assistedKg?: number | null
  weightedKg?: number | null
}

export interface Workout {
  id: string
  name: string
  focus: string
  exercises: WorkoutExercise[]
  createdAt?: string
  updatedAt?: string
}

export interface TrainingProgram {
  id: string
  version: number
  name: string
  focus: string
  daysPerWeek: number
  location: "casa" | "academia"
  status: "active" | "archived"
  source: "assistant" | "manual"
  createdAt: string
  activatedAt?: string | null
  workouts: Array<Pick<Workout, "id" | "name" | "focus">>
}

export interface BodyMeasurement {
  id: string
  type: MeasurementType
  value: number
  unit: MeasurementUnit
  date: string
  source?: "manual" | "assistant"
}

export interface SessionExercise {
  id?: string
  name: string
  modality: TrainingModality
  sets?: number | null
  reps?: number | null
  loadKg?: number | null
  restSec?: number | null
  distanceKm?: number | null
  durationSec?: number | null
  avgHr?: number | null
  progressionLevel?: string | null
  assistedKg?: number | null
  weightedKg?: number | null
}

export interface TrainingSessionLog {
  id: string
  workoutId?: string | null
  name: string
  modality: TrainingModality
  date: string
  durationSec?: number | null
  source?: "manual" | "assistant"
  exercises: SessionExercise[]
}

export interface TrainingSnapshot {
  workouts: Workout[]
  measurements: BodyMeasurement[]
  sessions: TrainingSessionLog[]
  programs: TrainingProgram[]
  programHistory: TrainingProgram[]
}
