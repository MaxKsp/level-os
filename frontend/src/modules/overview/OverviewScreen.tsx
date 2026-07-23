import { useMemo } from "react"
import { useFinance } from "../finance/store"
import { useApp } from "../../context/AppContext"
import { routineSummary, tasksOn } from "../routine/selectors"
import { OverviewHeader } from "./components/OverviewHeader"
import { FinanceOverview } from "./components/FinanceOverview"
import { RoutineOverview } from "./components/RoutineOverview"
import { TrainingOverview } from "./components/TrainingOverview"
import { VaultsOverview } from "./components/VaultsOverview"
import { ProgressOverview } from "../progress/components/ProgressOverview"
import { useIdentity } from "../identity/store"
import { financeTrendForPeriod, resolveFinancePeriod, toLocalIso } from "../finance/period"
import { netWorth } from "../finance/selectors"
import { useTraining } from "../training/store"
import type { WorkoutSession } from "../training/contracts"
import { FinancePanelSkeleton } from "../finance/FinanceSkeleton"

/**
 * Tela Visão Geral (multi-módulo).
 *
 * Agrega somente os stores canônicos já usados pelas telas de cada módulo.
 * Assim, uma alteração financeira, de rotina ou treino aparece aqui sem uma
 * segunda fonte simulada e sem fórmulas paralelas.
 */
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
  const workout: WorkoutSession = {
    title: workouts[0]?.name ?? "Treino atual",
    focus: workouts[0]?.focus ?? "Sessão configurada",
    durationMin: 45,
    exercises,
  }
  const overviewRange = useMemo(() => {
    const start = toLocalIso(new Date(now.getFullYear(), now.getMonth() - 5, 1))
    return resolveFinancePeriod("custom", start, todayIso, now)
  }, [now, todayIso])
  const financeTrend = useMemo(
    () => financeTrendForPeriod(bootstrap, overviewRange, netWorth(bootstrap))
      .map((point) => ({ month: point.label, value: point.value })),
    [bootstrap, overviewRange],
  )

  return (
    <main className="level-page mx-auto max-w-[1280px] px-4 pb-20 pt-24 sm:px-6 lg:px-8">
      <div>
        <OverviewHeader userName={identity.username.split(/\s+/)[0] || "você"} date={new Date()} pendingTasks={routine.pending} hasWorkout={hasWorkout} />
      </div>

      <div className="flex flex-col gap-10">
        <div>
          <ProgressOverview pendingTasks={routine.pending} workoutReady={hasWorkout} />
        </div>

        <section id="finance" className="scroll-mt-24">
          {syncStatus === "loading" ? <FinancePanelSkeleton overview /> : <FinanceOverview data={bootstrap} trend={financeTrend} detailsHref="/financeiro" />}
        </section>

        <section id="routine" aria-labelledby="modules-title" className="scroll-mt-24">
          <div className="mb-4 flex items-center justify-between">
            <h2
              id="modules-title"
              className="text-lg font-semibold text-on-surface"
            >
              Rotina e treino
            </h2>
          </div>
          <div className="grid items-start gap-x-8 gap-y-6 lg:grid-cols-2">
            <RoutineOverview tasks={todayTasks} />
            <span id="training" className="sr-only scroll-mt-24" />
            <TrainingOverview workout={workout} weights={loggedWeights} />
            <VaultsOverview vaults={bootstrap.vaults} className="lg:col-span-2" />
          </div>
        </section>
      </div>
    </main>
  )
}
