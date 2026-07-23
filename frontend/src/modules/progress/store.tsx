import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { hasProgressBackend, loadProgress, postProgressEvent } from "./api"
import type { Achievement, ProgressEventResult, ProgressEventType, ProgressFeedback, ProgressState } from "./contracts"

const DEMO_ACHIEVEMENTS: Achievement[] = [
  demoAchievement("primeiro_passo", "Primeiro passo", "Conclua sua primeira tarefa.", 40, "task_alt", "rotina", 34, 1),
  demoAchievement("rotina_10", "Dez em dia", "Conclua 10 tarefas da rotina.", 80, "checklist", "rotina", 34, 10),
  demoAchievement("rotina_50", "Ritmo próprio", "Conclua 50 tarefas da rotina.", 180, "event_available", "rotina", 34, 50),
  demoAchievement("rotina_100", "Disciplina diária", "Conclua 100 tarefas da rotina.", 300, "verified", "rotina", 34, 100),
  demoAchievement("rotina_250", "Ritual consolidado", "Conclua 250 tarefas da rotina.", 600, "calendar_month", "rotina", 34, 250),
  demoAchievement("primeiro_treino", "Corpo em movimento", "Conclua seu primeiro treino.", 80, "fitness_center", "treino", 12, 1),
  demoAchievement("treinos_5", "Série completa", "Conclua 5 treinos.", 120, "exercise", "treino", 12, 5),
  demoAchievement("treinos_20", "Base atlética", "Conclua 20 treinos.", 250, "sports_gymnastics", "treino", 12, 20),
  demoAchievement("treinos_50", "Constância física", "Conclua 50 treinos.", 400, "monitor_heart", "treino", 12, 50),
  demoAchievement("treinos_100", "Centena ativa", "Conclua 100 treinos.", 750, "military_tech", "treino", 12, 100),
  demoAchievement("controle_financeiro", "No controle", "Registre seu primeiro lançamento financeiro.", 30, "payments", "financeiro", 27, 1),
  demoAchievement("financeiro_10", "Mapa financeiro", "Registre 10 lançamentos financeiros.", 70, "account_balance_wallet", "financeiro", 27, 10),
  demoAchievement("financeiro_50", "Visão de longo prazo", "Registre 50 lançamentos financeiros.", 180, "insights", "financeiro", 27, 50),
  demoAchievement("financeiro_100", "Controle total", "Registre 100 lançamentos financeiros.", 300, "finance", "financeiro", 27, 100),
  demoAchievement("financeiro_250", "Precisão financeira", "Registre 250 lançamentos financeiros.", 600, "receipt_long", "financeiro", 27, 250),
  demoAchievement("sequencia_3", "Ritmo de três", "Mantenha uma sequência de três dias.", 90, "local_fire_department", "consistencia", 2, 3),
  demoAchievement("sequencia_7", "Semana consistente", "Mantenha uma sequência de sete dias.", 160, "date_range", "consistencia", 2, 7),
  demoAchievement("sequencia_30", "Mês de constância", "Mantenha uma sequência de 30 dias.", 500, "calendar_month", "consistencia", 2, 30),
  demoAchievement("sequencia_60", "Ritmo inabalável", "Mantenha uma sequência de 60 dias.", 850, "local_fire_department", "consistencia", 2, 60),
  demoAchievement("sequencia_100", "Cem dias presentes", "Mantenha uma sequência de 100 dias.", 1200, "trophy", "consistencia", 2, 100),
  demoAchievement("nivel_5", "Em evolução", "Alcance o nível 5.", 150, "military_tech", "nivel", 7, 5),
  demoAchievement("nivel_10", "Ascendente", "Alcance o nível 10.", 300, "rocket_launch", "nivel", 7, 10),
  demoAchievement("nivel_25", "Alta performance", "Alcance o nível 25.", 700, "trophy", "nivel", 7, 25),
  demoAchievement("nivel_50", "Meio século", "Alcance o nível 50.", 1500, "diamond", "nivel", 7, 50),
  demoAchievement("xp_1000", "Quatro dígitos", "Acumule 1.000 XP.", 200, "workspace_premium", "xp", 5920, 1000),
  demoAchievement("xp_5000", "Trajetória sólida", "Acumule 5.000 XP.", 400, "stars", "xp", 5920, 5000),
  demoAchievement("xp_10000", "Marco de dez mil", "Acumule 10.000 XP.", 800, "diamond", "xp", 5920, 10000),
  demoAchievement("xp_25000", "Trajetória rara", "Acumule 25.000 XP.", 1400, "stars", "xp", 5920, 25000),
  demoAchievement("xp_50000", "Legado em construção", "Acumule 50.000 XP.", 2200, "workspace_premium", "xp", 5920, 50000),
  demoAchievement("equilibrio_10", "Tríade em equilíbrio", "Conclua 10 ações em rotina, finanças e treinos.", 500, "target", "geral", 3, 3),
]

function demoAchievement(code: string, title: string, description: string, xp_bonus: number, icon: string, category: Achievement["category"], current: number, goal: number): Achievement {
  return { code, title, description, xp_bonus, icon, category, current, goal, unlocked: current >= goal, unlocked_at: null }
}

export const DEMO_PROGRESS: ProgressState = {
  level: 7,
  title: "Consistente",
  xp: 5920,
  xp_into_level: 771,
  xp_to_next: 1451,
  progress_pct: 34.7,
  streak: 2,
  achievements: [...DEMO_ACHIEVEMENTS].sort((a, b) => Number(b.unlocked) - Number(a.unlocked)),
  updated_at: null,
}

type ProgressStatus = "local" | "loading" | "ready" | "syncing" | "error"

interface LevelCelebration {
  level: number
  unlocked: Achievement[]
}

interface ProgressContextValue {
  progress: ProgressState
  status: ProgressStatus
  error: string | null
  lastDelta: number | null
  feedback: ProgressFeedback | null
  celebration: LevelCelebration | null
  refresh: () => Promise<void>
  awardEvent: (type: ProgressEventType, ref: string) => Promise<ProgressEventResult | null>
  dismissCelebration: () => void
  dismissFeedback: () => void
}

const ProgressContext = createContext<ProgressContextValue | undefined>(undefined)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const remote = hasProgressBackend()
  const [progress, setProgress] = useState<ProgressState>(DEMO_PROGRESS)
  const progressRef = useRef(progress)
  const [status, setStatus] = useState<ProgressStatus>(remote ? "loading" : "local")
  const [error, setError] = useState<string | null>(null)
  const [lastDelta, setLastDelta] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<ProgressFeedback | null>(null)
  const [celebration, setCelebration] = useState<LevelCelebration | null>(null)
  const demoAwardedRefs = useRef(new Set<string>())
  const feedbackId = useRef(0)
  const initialized = useRef(!remote)

  const showFeedback = useCallback((type: ProgressFeedback["type"], delta: number, unlocked: Achievement[] = []) => {
    if (delta <= 0) return
    setLastDelta(delta)
    feedbackId.current += 1
    setFeedback({ id: feedbackId.current, type, delta, unlocked })
  }, [])

  useEffect(() => { progressRef.current = progress }, [progress])

  const applyState = useCallback((next: ProgressState, unlocked: Achievement[] = []) => {
    const previousLevel = progressRef.current.level
    progressRef.current = next
    setProgress(next)
    if (next.level > previousLevel) setCelebration({ level: next.level, unlocked })
  }, [])

  const refresh = useCallback(async () => {
    if (!remote) return
    setStatus("syncing")
    try {
      const previous = progressRef.current
      const next = await loadProgress()
      if (initialized.current) {
        const previousUnlocked = new Set(previous.achievements.filter((item) => item.unlocked).map((item) => item.code))
        showFeedback("financeiro", next.xp - previous.xp, next.achievements.filter((item) => item.unlocked && !previousUnlocked.has(item.code)))
      }
      applyState(next)
      initialized.current = true
      setStatus("ready")
      setError(null)
    } catch (cause) {
      setStatus("error")
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar sua progressão.")
    }
  }, [applyState, remote, showFeedback])

  useEffect(() => { void refresh() }, [refresh])

  const awardEvent = useCallback(async (type: ProgressEventType, ref: string) => {
    if (!remote) {
      if (demoAwardedRefs.current.has(ref)) return null
      demoAwardedRefs.current.add(ref)
      const delta = type === "treino" ? 80 : 20
      showFeedback(type, delta)
      setProgress((current) => ({
        ...current,
        xp: current.xp + delta,
        xp_into_level: current.xp_into_level + delta,
        xp_to_next: Math.max(0, current.xp_to_next - delta),
        progress_pct: Math.min(100, current.progress_pct + delta / 22.22),
      }))
      return null
    }
    setStatus("syncing")
    try {
      const result = await postProgressEvent(type, ref)
      showFeedback(type, result.delta, result.unlocked)
      applyState(result.state, result.unlocked)
      if (result.level_up) setCelebration({ level: result.state.level, unlocked: result.unlocked })
      setStatus("ready")
      setError(null)
      return result
    } catch (cause) {
      setStatus("error")
      setError(cause instanceof Error ? cause.message : "Não foi possível registrar o XP.")
      return null
    }
  }, [applyState, remote, showFeedback])

  const dismissCelebration = useCallback(() => setCelebration(null), [])
  const dismissFeedback = useCallback(() => setFeedback(null), [])

  return (
    <ProgressContext.Provider value={{
      progress,
      status,
      error,
      lastDelta,
      feedback,
      celebration,
      refresh,
      awardEvent,
      dismissCelebration,
      dismissFeedback,
    }}>
      {children}
    </ProgressContext.Provider>
  )
}

export function useProgress(): ProgressContextValue {
  const context = useContext(ProgressContext)
  if (!context) throw new Error("useProgress precisa estar dentro de <ProgressProvider>")
  return context
}
