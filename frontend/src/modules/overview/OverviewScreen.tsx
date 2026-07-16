import { financeBootstrapMock, netWorthTrendMock } from "../finance/mock"
import { tasksMock } from "../routine/mock"
import { routineSummary } from "../routine/selectors"
import { weightHistoryMock, workoutMock } from "../training/mock"
import { OverviewHeader } from "./components/OverviewHeader"
import { FinanceOverview } from "./components/FinanceOverview"
import { RoutineOverview } from "./components/RoutineOverview"
import { TrainingOverview } from "./components/TrainingOverview"
import { VaultsOverview } from "./components/VaultsOverview"

/**
 * Tela Visão Geral (multi-módulo).
 *
 * Composição pura: os mocks ISOLADOS de cada módulo entram por props, sem
 * fetch. Para ligar ao backend real, basta trocar cada `*Mock` pela leitura de
 * `GET api/data.php?all=1` — o contrato já é espelhado em cada módulo.
 */
export function OverviewScreen() {
  const routine = routineSummary(tasksMock)

  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-20 pt-24 sm:px-6 lg:px-8">
      <OverviewHeader
        userName="Lucas"
        date={new Date(2026, 6, 16)}
        pendingTasks={routine.pending}
      />

      <div className="flex flex-col gap-8">
        <section id="finance" className="scroll-mt-24">
          <FinanceOverview data={financeBootstrapMock} trend={netWorthTrendMock} />
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
          <div className="grid gap-3 lg:grid-cols-3">
            <RoutineOverview tasks={tasksMock} />
            <span id="training" className="sr-only scroll-mt-24" />
            <TrainingOverview workout={workoutMock} weights={weightHistoryMock} />
            <VaultsOverview vaults={financeBootstrapMock.vaults} />
          </div>
        </section>
      </div>
    </main>
  )
}
