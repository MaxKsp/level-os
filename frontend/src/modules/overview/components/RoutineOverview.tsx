import { Link } from "react-router-dom"
import { AnimatedNumber } from "../../../components/ui/AnimatedNumber"
import { Icon, ProgressRing, SectionCard } from "../../../design-system"
import type { Task } from "../../routine/contracts"
import { routineSummary } from "../../routine/selectors"

interface RoutineOverviewProps {
  tasks: Task[]
}

export function RoutineOverview({ tasks }: RoutineOverviewProps) {
  const summary = routineSummary(tasks)
  const upcoming = tasks.filter((t) => !t.completed).slice(0, 3)

  return (
    <SectionCard
      title="Rotina de hoje"
      description="Prioridades por horário"
      bodyClassName="p-0"
      action={
        <Link
          to="/agenda"
          className="rounded text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          Ver rotina
        </Link>
      }
    >
      <div className="flex items-center gap-5 px-5 py-5 sm:px-6">
        <ProgressRing value={summary.progress} size={104}>
          <span className="font-mono text-xl font-semibold text-on-surface">
            <AnimatedNumber value={summary.progress} animationKey="overview-routine-progress" formatValue={(value) => `${Math.round(value)}%`} />
          </span>
        </ProgressRing>
        <div>
          <p className="text-sm font-medium text-on-surface">Progresso do dia</p>
          <p className="mt-1 text-sm leading-5 text-on-surface-variant">
            <AnimatedNumber value={summary.completed} animationKey="overview-routine-completed" formatValue={(value) => Math.round(value).toLocaleString("pt-BR")} /> de <AnimatedNumber value={summary.total} animationKey="overview-routine-total" formatValue={(value) => Math.round(value).toLocaleString("pt-BR")} /> tarefas concluídas.
          </p>
          <p className="mt-3 text-xs font-medium text-tertiary">
            {summary.pending === 0 ? "Tudo em dia" : "Bom ritmo"}
          </p>
        </div>
      </div>

      <div className="border-t border-outline-variant">
        <p className="px-5 pt-4 text-sm text-muted sm:px-6">
          A seguir
        </p>
        <ul className="px-2 py-2">
          {upcoming.length === 0 ? (
            <li className="px-3 py-3 text-sm text-on-surface-variant">
              Nenhuma tarefa pendente.
            </li>
          ) : (
            upcoming.map((task) => (
              <li
                key={task.id}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/[0.025]"
              >
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md border border-outline">
                  <Icon
                    name="radio_button_unchecked"
                    className="text-[14px] text-muted"
                  />
                </span>
                <span className="w-12 shrink-0 font-mono text-xs text-muted">
                  {task.time}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-on-surface">
                  {task.title}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </SectionCard>
  )
}
