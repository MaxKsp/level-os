import { formatLongDate } from "../../../lib/format"

interface OverviewHeaderProps {
  userName: string
  date: Date
  pendingTasks: number
  hasWorkout: boolean
}

/** Cabeçalho da Visão Geral. Sem ações principais: elas vivem nos módulos
 *  correspondentes (despesa em Finanças, tarefa em Rotina). */
export function OverviewHeader({
  userName,
  date,
  pendingTasks,
  hasWorkout,
}: OverviewHeaderProps) {
  const hour = date.getHours()
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite"

  return (
    <section className="level-page-header mb-8">
      <p className="mb-2 text-sm font-medium text-muted">
        {formatLongDate(date)}
      </p>
      <h1 className="level-page-title text-3xl font-semibold tracking-tight text-on-surface text-balance sm:text-4xl">
        {greeting}, {userName}.
      </h1>
      <p className="mt-2 text-base text-on-surface-variant text-pretty">
        Você tem {pendingTasks}{" "}
        {pendingTasks === 1 ? "tarefa pendente" : "tarefas pendentes"}
        {hasWorkout ? " e um treino disponível hoje." : ". Seu treino de hoje já foi concluído."}
      </p>
    </section>
  )
}
