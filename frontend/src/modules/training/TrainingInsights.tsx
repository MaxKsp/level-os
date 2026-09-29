import { useMemo } from "react"
import { Activity, ArrowUpRight, CalendarDays, Dumbbell, Play, Target, TrendingUp } from "lucide-react"
import { Button } from "../../components/ui/button"
import { AnimatedNumber } from "../../components/ui/AnimatedNumber"
import type { TrainingProgram, TrainingSessionLog, Workout } from "./contracts"
import { trainingAnalytics } from "./trainingAnalytics"
import { nextWorkout } from "./nextWorkout"

interface Props {
  sessions: TrainingSessionLog[]
  workouts: Workout[]
  programs: TrainingProgram[]
  onStart: (workout: Workout) => void
  onCreate: () => void
  onQuickLog: () => void
}
const number = (value: number) => value.toLocaleString("pt-BR")
export function TrainingInsights({ sessions, workouts, programs, onStart, onCreate, onQuickLog }: Props) {
  const today = new Date().toLocaleDateString("sv-SE")
  const stats = useMemo(() => trainingAnalytics(sessions, today), [sessions, today])
  const goal = programs.find((p) => p.status === "active")?.daysPerWeek ?? null
  const goalProgress = goal ? Math.min(100, Math.round(stats.weekCount / goal * 100)) : 0
  const maxDay = Math.max(1, ...stats.trend.map((day) => day.count))
  const highlighted = useMemo(() => nextWorkout(workouts, programs, sessions), [workouts, programs, sessions])
  const metrics = [
    { label: "Sessões na semana", value: stats.weekCount, suffix: "", icon: Dumbbell, detail: `Semana anterior: ${stats.previousWeekCount}` },
    { label: "Volume registrado", value: stats.weekVolumeKg, suffix: " kg", icon: TrendingUp, detail: "Séries × repetições × carga" },
    { label: "Minutos treinados", value: stats.weekMinutes, suffix: " min", icon: Activity, detail: "Duração informada nas sessões" },
    { label: "Dias ativos / 28 dias", value: stats.activeDays28, suffix: "", icon: CalendarDays, detail: "Dias distintos com registro" },
  ]
  return (
    <section aria-label="Central de performance" className="relative isolate overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low p-4 shadow-[var(--shadow-panel)] sm:p-6">
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-44 -z-10 size-[30rem] rounded-full bg-primary/10 blur-[110px]" />
      <div className="flex flex-col justify-between gap-5 border-b border-outline-variant pb-5 md:flex-row md:items-end">
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-2 text-[10px] font-bold tracking-[.2em] text-primary"><span className="size-1.5 rounded-full bg-primary shadow-[0_0_12px_currentColor]" /> TRAINING / PERFORMANCE</div>
          <h2 className="text-2xl font-semibold tracking-tight text-on-surface sm:text-3xl">Seu centro de treinamento.</h2>
          <p className="mt-2 max-w-[52ch] text-sm leading-6 text-on-surface-variant">Acompanhe frequência, carga e consistência com base nas suas sessões reais.</p>
        </div>
        <Button variant="primary" size="md" className="w-full sm:w-auto" onClick={highlighted ? () => onStart(highlighted) : onCreate}>
          <Play className="size-4" /> {highlighted ? "Iniciar proxima ficha" : "Criar primeira ficha"}
        </Button>
      </div>
      {highlighted ? <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 p-3 sm:p-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[.15em] text-primary">Proxima ficha sugerida</p>
          <p className="mt-1 text-sm font-semibold text-on-surface">{highlighted.name}</p>
          <p className="mt-1 text-xs text-muted">{highlighted.focus || "Foco livre"} · {highlighted.exercises.length} exercicio(s)</p>
        </div>
        <p className="max-w-[30ch] text-[11px] leading-5 text-muted">Rotacao pela ordem do programa e pelo seu ultimo registro. Nao substitui seu planejamento semanal.</p>
      </div> : null}
      <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
        {metrics.map(({ label, value, suffix, icon: MetricIcon, detail }) => (
          <div key={label} className="min-w-0 rounded-xl border border-outline-variant bg-surface/70 p-3 sm:p-4">
            <div className="mb-5 flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><MetricIcon className="size-4" /></div>
            <AnimatedNumber value={value} animationKey={label} formatValue={(n) => number(Math.round(n)) + suffix} className="numeric-value block break-words text-xl font-semibold tracking-tight text-on-surface sm:text-[1.65rem]" />
            <p className="mt-2 text-xs font-semibold text-on-surface">{label}</p>
            <p className="mt-1 text-[10px] leading-4 text-muted">{detail}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1.3fr_.7fr]">
        <div className="rounded-xl border border-outline-variant bg-surface/55 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-on-surface">Atividade dos últimos 7 dias</h3>
            <span className="text-[11px] text-muted">{stats.trend.reduce((sum, d) => sum + d.count, 0)} sessões registradas</span>
          </div>
          <div className="mt-5 grid h-28 grid-cols-7 items-end gap-2" aria-label="Sessões por dia nos últimos sete dias">
            {stats.trend.map((day) => (
              <div key={day.date} className="flex h-full flex-col items-center justify-end gap-2" title={`${day.date}: ${day.count} sessão(ões)`}>
                <div className="flex w-full flex-1 items-end justify-center rounded-md bg-surface-container/65 p-1">
                  <div className="w-full max-w-8 rounded-[4px] bg-primary/85 transition-[height] motion-reduce:transition-none" style={{ height: day.count ? `${Math.max(13, day.count / maxDay * 100)}%` : "3px", opacity: day.count ? 1 : .22 }} />
                </div>
                <span className="text-[10px] font-semibold tabular-nums text-muted">{new Date(day.date + "T12:00:00Z").toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" }).replace(".", "")}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col justify-between gap-5 rounded-xl border border-outline-variant bg-surface/55 p-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-on-surface"><Target className="size-4 text-primary" /> Meta semanal</div>
            {goal ? <><p className="mt-4 text-2xl font-semibold tabular-nums text-on-surface">{stats.weekCount} <span className="text-sm font-normal text-muted">/ {goal} sessões</span></p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-outline-variant"><div className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none" style={{ width: `${goalProgress}%` }} /></div>
              <p className="mt-2 text-xs text-muted">{goalProgress}% da frequência definida no programa ativo</p></>
              : <p className="mt-3 text-sm leading-5 text-muted">Ative um programa com o Personal Léo para acompanhar sua frequência planejada.</p>}
          </div>
          <div className="border-t border-outline-variant pt-3">
            {stats.personalBest ? <p className="text-xs text-muted">Maior carga registrada <strong className="mt-1 block text-sm text-on-surface">{stats.personalBest.name} · {number(stats.personalBest.load)} kg</strong></p> : <p className="text-xs text-muted">Sua maior carga aparecerá após registrar uma sessão de força.</p>}
            <button type="button" onClick={onQuickLog} className="mt-3 inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary">Registrar sessão livre <ArrowUpRight className="size-4" /></button>
          </div>
        </div>
      </div>
    </section>
  )
}
