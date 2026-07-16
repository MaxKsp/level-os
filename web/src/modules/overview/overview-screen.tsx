import { financeBootstrapMock, netWorthTrendMock } from "@/modules/finance/mock"
import { tasksMock } from "@/modules/routine/mock"
import { routineSummary } from "@/modules/routine/selectors"
import { weightHistoryMock, workoutMock } from "@/modules/training/mock"
import { TopBar } from "./components/top-bar"
import { OverviewHeader } from "./components/overview-header"
import { FinanceOverview } from "./components/finance-overview"
import { RoutineOverview } from "./components/routine-overview"
import { TrainingOverview } from "./components/training-overview"
import { VaultsOverview } from "./components/vaults-overview"

/**
 * Tela Visão Geral (multi-módulo).
 *
 * Server Component: os mocks isolados de cada módulo entram por composição,
 * sem fetch no cliente. Para ligar ao backend real, basta substituir cada
 * `*Mock` pela leitura de `GET api/data.php?all=1` — o contrato já é espelhado.
 */
export function OverviewScreen() {
  const routine = routineSummary(tasksMock)

  return (
    <div className="min-h-dvh tech-bg">
      <TopBar />

      <main className="mx-auto max-w-[1440px] px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <OverviewHeader
          userName="Lucas"
          date={new Date(2026, 6, 16)}
          pendingTasks={routine.pending}
        />

        <div className="flex flex-col gap-8">
          <FinanceOverview
            data={financeBootstrapMock}
            trend={netWorthTrendMock}
          />

          <section
            id="routine"
            aria-labelledby="modules-title"
            className="scroll-mt-20"
          >
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
              <TrainingOverview
                workout={workoutMock}
                weights={weightHistoryMock}
              />
              <VaultsOverview vaults={financeBootstrapMock.vaults} />
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
