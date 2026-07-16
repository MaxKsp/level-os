import { Button } from "../../../components/ui/Button"
import { Icon } from "../../../design-system"
import { formatLongDate } from "../../../lib/format"

interface OverviewHeaderProps {
  userName: string
  date: Date
  pendingTasks: number
}

export function OverviewHeader({
  userName,
  date,
  pendingTasks,
}: OverviewHeaderProps) {
  return (
    <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <p className="mb-2 text-sm font-medium text-muted">
          {formatLongDate(date)}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-on-surface text-balance sm:text-4xl">
          Bom dia, {userName}.
        </h1>
        <p className="mt-2 text-base text-on-surface-variant text-pretty">
          Você tem {pendingTasks}{" "}
          {pendingTasks === 1 ? "tarefa pendente" : "tarefas pendentes"} e um
          treino programado para hoje.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="md">
          <Icon name="payments" className="text-[18px]" />
          Lançar despesa
        </Button>
        <Button variant="primary" size="md">
          <Icon name="add" className="text-[18px]" />
          Nova tarefa
        </Button>
      </div>
    </section>
  )
}
