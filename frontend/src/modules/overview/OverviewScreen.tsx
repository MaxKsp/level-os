import { useMemo } from "react"
import { Link } from "react-router-dom"
import { Icon } from "../../design-system"
import { useApp } from "../../context/AppContext"
import { useFinance } from "../finance/store"
import { financeInsights } from "../finance/financeInsights"
import { financeTrendForPeriod, resolveFinancePeriod, toLocalIso } from "../finance/period"
import { netWorth } from "../finance/selectors"
import { FinancePanelSkeleton } from "../finance/FinanceSkeleton"
import { useIdentity } from "../identity/store"
import { ProgressOverview } from "../progress/components/ProgressOverview"
import { routineConsistency, routineSummary, tasksOn } from "../routine/selectors"
import { useTraining } from "../training/store"
import type { WorkoutSession } from "../training/contracts"
import { OverviewHeader } from "./components/OverviewHeader"
import { FinanceOverview } from "./components/FinanceOverview"
import { RoutineOverview } from "./components/RoutineOverview"
import { TrainingOverview } from "./components/TrainingOverview"
import { VaultsOverview } from "./components/VaultsOverview"

export function OverviewScreen() {
  const { bootstrap, syncStatus } = useFinance()
  const { tasks, exercises, loggedWeights } = useApp()
  const { workouts } = useTraining()
  const { identity } = useIdentity()
  const now = useMemo(() => new Date(), [])
  const todayIso = toLocalIso(now)
  const todayTasks = tasksOn(tasks, todayIso, todayIso)
  const routine = routineSummary(todayTasks)
  const hasWorkout = exercises.some((exercise) => !exercise.completed)
  const workout: WorkoutSession = { title: workouts[0]?.name ?? "Treino atual", focus: workouts[0]?.focus ?? "Sessão configurada", durationMin: 45, exercises }
  const weekStart = useMemo(() => {
    const value = new Date(now)
    value.setDate(value.getDate() - ((value.getDay() + 6) % 7))
    return toLocalIso(value)
  }, [now])
  const weekEnd = useMemo(() => {
    const value = new Date(now)
    value.setDate(value.getDate() - ((value.getDay() + 6) % 7) + 7)
    return toLocalIso(value)
  }, [now])
  const weekly = routineConsistency(tasks, weekStart, weekEnd, todayIso)
  const insight = useMemo(() => financeInsights(bootstrap, now)[0] ?? null, [bootstrap, now])
  const overviewRange = useMemo(() => resolveFinancePeriod("custom", toLocalIso(new Date(now.getFullYear(), now.getMonth() - 5, 1)), todayIso, now), [now, todayIso])
  const financeTrend = useMemo(() => financeTrendForPeriod(bootstrap, overviewRange, netWorth(bootstrap)).map((point) => ({ month: point.label, value: point.value })), [bootstrap, overviewRange])

  return (
    <main className="level-page mx-auto max-w-[1280px] px-4 pb-20 pt-24 sm:px-6 lg:px-8">
      <OverviewHeader userName={identity.username.split(/\s+/)[0] || "você"} avatar={identity.avatar} date={now} pendingTasks={routine.pending} hasWorkout={hasWorkout} />
      <div className="flex flex-col gap-8">
        <section aria-labelledby="today-title" className="border-y border-outline-variant py-5">
          <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-medium text-primary">Prioridades</p><h2 id="today-title" className="mt-1 text-xl font-semibold text-on-surface">Hoje</h2></div><span className="font-mono text-xs text-muted">{weekly.percent}% da semana concluída</span></div>
          <div className="mb-5 h-1 overflow-hidden rounded-full bg-surface-container-high" role="progressbar" aria-label="Progresso da semana" aria-valuemin={0} aria-valuemax={100} aria-valuenow={weekly.percent}>
            <span className="block h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${weekly.percent}%` }} />
          </div>
          <div className="grid divide-y divide-outline-variant md:grid-cols-3 md:divide-x md:divide-y-0">
            <TodayItem to="/agenda" icon="schedule" label="Próxima tarefa" value={routine.nextTask ? `${routine.nextTask.time} · ${routine.nextTask.title}` : "Rotina concluída"} detail={`${routine.pending} pendente(s) hoje`} />
            <TodayItem to="/treinos" icon="fitness_center" label="Próximo treino" value={hasWorkout ? workout.title : "Treino concluído"} detail={workout.focus} />
            <TodayItem to="/financeiro?tab=dash" icon={insight?.icon ?? "monitoring"} label="Alerta financeiro" value={insight?.title ?? "Sem alertas importantes"} detail={insight?.detail ?? "Seus indicadores estão dentro do esperado."} />
          </div>
        </section>
        <section id="finance" className="scroll-mt-24">{syncStatus === "loading" ? <FinancePanelSkeleton overview /> : <FinanceOverview data={bootstrap} trend={financeTrend} detailsHref="/financeiro" />}</section>
        <section id="routine" aria-labelledby="modules-title" className="scroll-mt-24">
          <div className="mb-4 flex items-center justify-between"><h2 id="modules-title" className="text-lg font-semibold text-on-surface">Rotina e treino</h2></div>
          <div className="grid items-start gap-x-8 gap-y-6 lg:grid-cols-2"><RoutineOverview tasks={todayTasks} /><span id="training" className="sr-only scroll-mt-24" /><TrainingOverview workout={workout} weights={loggedWeights} /><VaultsOverview vaults={bootstrap.vaults} className="lg:col-span-2" /></div>
        </section>
        <section aria-label="Progresso e conquistas" className="border-t border-outline-variant pt-6">
          <ProgressOverview pendingTasks={routine.pending} workoutReady={hasWorkout} />
        </section>
      </div>
    </main>
  )
}

function TodayItem({ to, icon, label, value, detail }: { to: string; icon: string; label: string; value: string; detail: string }) {
  return <Link to={to} className="level-row-action group flex min-w-0 gap-3 px-1 py-4 first:pt-0 md:px-5 md:py-1 md:first:pl-0 md:last:pr-0"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon name={icon} className="text-[19px]" /></span><span className="min-w-0 flex-1"><span className="block text-xs text-muted">{label}</span><span className="mt-1 block truncate text-sm font-semibold text-on-surface">{value}</span><span className="mt-1 block line-clamp-2 text-xs leading-5 text-muted">{detail}</span></span><Icon name="arrow_forward" className="mt-3 text-[16px] text-muted transition-transform group-hover:translate-x-0.5" /></Link>
}
