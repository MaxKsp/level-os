import { useMemo } from "react"
import { AlertTriangle, ArrowUpRight, CalendarDays, CheckCircle2, Target } from "lucide-react"
import { SectionCard } from "../../design-system"
import type { Task } from "./contracts"
import { routineFocus } from "./routineFocus"
export function RoutineFocusPanel({ tasks, date, fallbackDate, onManage, onDay }: {
  tasks: Task[]; date: string; fallbackDate: string
  onManage: (id: string, date: string) => void; onDay: (date: string) => void
}) {
  const plan = useMemo(() => routineFocus(tasks, date, fallbackDate), [tasks, date, fallbackDate])
  const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
  return <section aria-label="Painel de planejamento" className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
    <SectionCard title="Foco do período" description={plan.total ? plan.completed + " de " + plan.total + " tarefa(s) concluída(s)" : "Nenhuma tarefa neste dia"} icon={<Target className="size-5 text-primary" />}>
      {plan.pending.length ? <ul className="divide-y divide-outline-variant">
        {plan.pending.slice(0, 3).map((task) => <li key={task.id}>
          <button type="button" onClick={() => onManage(task.id, date)} className="flex min-h-14 w-full items-center gap-3 py-2 text-left hover:text-primary">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><CalendarDays className="size-4" /></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-on-surface">{task.title}</span>
              <span className="mt-1 block text-[11px] text-muted">{task.time || "Sem horário"} · {task.priority === "alta" ? "Alta prioridade" : task.priority === "baixa" ? "Baixa prioridade" : "Prioridade normal"}</span></span>
            <ArrowUpRight className="size-4 shrink-0 text-muted" />
          </button>
        </li>)}
      </ul> : <div className="flex items-center gap-2 py-4 text-xs text-muted"><CheckCircle2 className="size-4 text-primary" />Tudo concluído ou sem itens nesta data.</div>}
      {plan.conflicts.length ? <div className="mt-3 rounded-lg border border-warning/30 bg-warning/5 p-3">
        <p className="inline-flex items-center gap-2 text-xs font-semibold text-on-surface"><AlertTriangle className="size-4 text-warning" />{plan.conflicts.length} possível(is) conflito(s) de horário</p>
        <p className="mt-1 text-[11px] leading-5 text-muted">{plan.conflicts.slice(0, 2).map((pair) => pair.left.title + " / " + pair.right.title).join(" · ")}. Sem duração registrada, estimamos 30 minutos.</p>
      </div> : null}
    </SectionCard>
    <SectionCard title="Mapa da semana" description="Ocorrências reais, inclusive séries recorrentes" icon={<CalendarDays className="size-5 text-primary" />}>
      <div className="grid grid-cols-7 gap-1.5">
        {plan.week.map((day, i) => <button key={day.date} type="button" onClick={() => onDay(day.date)} aria-label={day.date + ": " + day.completed + " de " + day.total + " tarefa(s) feita(s)"}
          className={"group min-w-0 rounded-lg border px-1 py-3 text-center transition-colors hover:border-primary/40 " + (day.date === date ? "border-primary/40 bg-primary/10" : "border-outline-variant bg-surface/50")}>
          <span className="block text-[10px] font-semibold text-muted">{weekdays[i]}</span>
          <span className="mt-2 block text-base font-semibold tabular-nums text-on-surface">{day.total}</span>
          <span className="mt-1 block text-[10px] text-primary">{day.completed} feito(s)</span>
          <span className="mt-3 block h-1 rounded-full bg-outline-variant"><span className="block h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none" style={{ width: (day.total ? day.completed / day.total * 100 : 0) + "%" }} /></span>
        </button>)}
      </div>
      <p className="mt-3 text-[11px] leading-5 text-muted">Toque em um dia para abrir as tarefas. A visualização respeita pausas, exclusões e conclusão de ocorrências recorrentes.</p>
    </SectionCard>
  </section>
}
