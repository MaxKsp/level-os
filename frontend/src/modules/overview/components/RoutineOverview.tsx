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
        <a
          href="#routine"
          className="text-sm font-medium text-primary hover:text-on-surface"
        >
          Abrir
        </a>
      }
    >
      <div className="flex items-center gap-5 px-5 py-5 sm:px-6">
        <ProgressRing value={summary.progress} size={104}>
          <span className="font-mono text-xl font-semibold text-on-surface">
            {summary.progress}%
          </span>
        </ProgressRing>
        <div>
          <p className="text-sm font-medium text-on-surface">Progresso do dia</p>
          <p className="mt-1 text-sm leading-5 text-on-surface-variant">
            {summary.completed} de {summary.total} tarefas concluídas.
          </p>
          <p className="mt-3 text-xs font-medium text-tertiary">
            {summary.pending === 0 ? "Tudo em dia" : "Bom ritmo"}
          </p>
        </div>
      </div>

      <div className="border-t border-outline-variant">
        <p className="px-5 pt-4 text-xs font-medium uppercase tracking-wider text-muted sm:px-6">
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
