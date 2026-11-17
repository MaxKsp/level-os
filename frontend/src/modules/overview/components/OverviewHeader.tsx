import { formatLongDate } from "../../../lib/format"

interface OverviewHeaderProps {
  userName: string
  date: Date
  pendingTasks: number
  hasWorkout: boolean
  avatar?: string | null
}

export function OverviewHeader({ userName, date, pendingTasks, hasWorkout, avatar }: OverviewHeaderProps) {
  const hour = date.getHours()
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite"
  const avatarUrl = avatar ? (avatar.startsWith("http") || avatar.startsWith("/") ? avatar : `/${avatar}`) : null
  return (
    <section className="level-page-header mb-8">
      <p className="mb-2 text-sm font-medium text-muted">{formatLongDate(date)}</p>
      <div className="flex items-center gap-4">
        {avatarUrl ? <img src={avatarUrl} alt="" className="size-12 rounded-full object-cover ring-1 ring-outline-variant" /> : null}
        <h1 className="level-page-title text-3xl font-semibold tracking-tight text-on-surface text-balance sm:text-4xl">{greeting}, {userName}.</h1>
      </div>
      <p className="mt-2 text-base text-on-surface-variant text-pretty">Você tem {pendingTasks} {pendingTasks === 1 ? "tarefa pendente" : "tarefas pendentes"}{hasWorkout ? " e um treino disponível hoje." : ". Seu treino de hoje já foi concluído."}</p>
    </section>
  )
}
