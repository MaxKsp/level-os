import { useMemo } from "react"
import { Link } from "react-router-dom"
import { Activity, ArrowUpRight, CalendarCheck2, Dumbbell, Landmark, Sparkles, Target, Utensils } from "lucide-react"
import { SectionCard } from "../../../design-system"
import { useApp } from "../../../context/AppContext"
import { useFinance } from "../../finance/store"
import { financeControl } from "../../finance/financeControl"
import { useTraining } from "../../training/store"
import { trainingAnalytics } from "../../training/trainingAnalytics"
import { useNutrition } from "../../nutrition/store"
import { dietBudget } from "../../nutrition/dietBudget"
import { tasksOn } from "../../routine/selectors"
import { useAssistant, type AssistantModule } from "../../assistant/store"
import { useProgress } from "../store"
import { crossModuleTimeline, type TimelineModule } from "../crossModuleTimeline"

const marker: Record<TimelineModule, typeof Activity> = {
  treinos: Dumbbell, rotina: CalendarCheck2, financeiro: Landmark, alimentacao: Utensils, progresso: Target,
}
const label: Record<TimelineModule, string> = {
  treinos: "Treinos", rotina: "Rotina", financeiro: "Finanças", alimentacao: "Alimentação", progresso: "Progresso",
}
export function CrossModuleJourney() {
  const { tasks } = useApp()
  const finance = useFinance()
  const training = useTraining()
  const nutrition = useNutrition()
  const { progress } = useProgress()
  const assistant = useAssistant()
  const today = useMemo(() => new Date().toLocaleDateString("sv-SE"), [])
  const live = typeof window !== "undefined" && Boolean(window.CSRF_TOKEN)
  const timeline = useMemo(() => crossModuleTimeline({
    tasks, sessions: training.sessions, finance: finance.bootstrap, nutrition: nutrition.plan, progress,
  }, today), [tasks, training.sessions, finance.bootstrap, nutrition.plan, progress, today])
  const dayTasks = useMemo(() => tasksOn(tasks, today, today), [tasks, today])
  const weekly = useMemo(() => trainingAnalytics(training.sessions, today), [training.sessions, today])
  const activeProgram = training.programs.find((program) => program.status === "active") ?? null
  const food = nutrition.plan ? dietBudget(nutrition.plan) : null
  const financial = useMemo(() => financeControl(finance.bootstrap, today), [finance.bootstrap, today])
  const goals = [
    { name: "Rotina", current: dayTasks.filter((item) => item.completed).length, target: dayTasks.length, detail: "tarefas de hoje", path: "/agenda" },
    { name: "Treinamento", current: weekly.weekCount, target: activeProgram?.daysPerWeek ?? null, detail: "sessões na semana", path: "/treinos" },
    { name: "Alimentação", current: food?.totalEstimate ?? null, target: food?.budget ?? null, detail: "custo estimado / orçamento", path: "/alimentacao" },
  ]
  const suggestions: Array<{ module: AssistantModule; title: string; context: string; prompt: string }> = [
    { module: "agenda", title: "Organizar prioridades", context: dayTasks.filter((item) => !item.completed).length + " tarefa(s) pendente(s)",
      prompt: "Analise minhas tarefas pendentes de hoje e proponha uma ordem de prioridade. Antes de criar ou alterar algo, apresente a proposta para minha revisão." },
    { module: "treinos", title: "Revisar evolução de carga", context: training.sessions.length + " sessão(ões) no histórico",
      prompt: "Revise meus registros disponíveis de treino, séries e cargas. Mostre minha evolução e sugira ajustes na minha ficha somente para eu analisar antes de confirmar." },
    { module: "financeiro", title: "Revisar lançamentos", context: financial.unlinked.length + " despesa(s) sem conta válida",
      prompt: "Ajude-me a revisar meus lançamentos e eventuais vínculos de conta ausentes. Não marque nenhum pagamento como confirmado nem altere dados sem minha aprovação." },
    { module: "alimentacao", title: "Avaliar o cardápio", context: nutrition.plan ? "Plano alimentar ativo" : "Plano ainda não configurado",
      prompt: "Ajude-me a rever meu cardápio, período e orçamento registrado. Apresente sugestões para revisão, considerando restrições que eu informar, antes de criar ou substituir um plano." },
  ]
  return <section aria-label="Jornada integrada do Level OS" className="mt-8 grid gap-4 border-t border-outline-variant pt-6 lg:grid-cols-[1.15fr_.85fr]">
    <SectionCard title="Linha do tempo da evolução" description="Últimos 14 dias · reconstruída dos registros atualmente disponíveis" icon={<Activity className="size-5 text-primary" />} bodyClassName="p-0">
      {!live ? <p className="p-5 text-sm text-muted">Entre em sua conta para consultar o histórico real dos módulos.</p> :
        !timeline.length ? <p className="p-5 text-sm text-muted">Nenhuma atividade com data registrada neste intervalo.</p> :
        <ol className="divide-y divide-outline-variant">
          {timeline.map((event) => {
            const Symbol = marker[event.module]
            return <li key={event.id}><Link to={event.href} className="group flex min-h-16 items-start gap-3 px-4 py-3 hover:bg-surface-container/55">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-primary"><Symbol className="size-4" /></span>
              <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <strong className="text-xs font-semibold text-on-surface">{event.title}</strong><span className="text-[10px] text-primary">{label[event.module]}</span></span>
                <span className="mt-1 block truncate text-[11px] text-on-surface-variant">{event.detail}</span>
              </span>
              <span className="shrink-0 text-[10px] tabular-nums text-muted">{new Date(event.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
              <ArrowUpRight className="mt-1 size-3.5 shrink-0 text-muted group-hover:text-primary" />
            </Link></li>
          })}
        </ol>}
      <p className="border-t border-outline-variant px-4 py-3 text-[10px] leading-4 text-muted">Atividade reconstruída; exclusões antigas podem não aparecer. Não representa um log contábil ou de auditoria imutável.</p>
    </SectionCard>
    <SectionCard title="Metas conectadas" description="Somente metas definidas e valores efetivamente registrados" icon={<Target className="size-5 text-primary" />}>
      {!live ? <p className="py-4 text-xs text-muted">Seus indicadores serão exibidos após autenticar-se.</p> :
        <div className="space-y-3">
          {goals.map((goal) => {
            const hasTarget = goal.target !== null && goal.target > 0
            const percent = hasTarget && goal.current !== null ? Math.min(100, Math.max(0, goal.current / goal.target! * 100)) : 0
            const format = (number: number) => goal.name === "Alimentação" ? number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : number.toLocaleString("pt-BR")
            return <Link key={goal.name} to={goal.path} className="group block rounded-lg border border-outline-variant bg-surface/50 p-3 hover:border-primary/30">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-on-surface">{goal.name}</span>
                <span className="text-[11px] tabular-nums text-muted">{hasTarget && goal.current !== null ? format(goal.current) + " / " + format(goal.target!) : "Sem meta definida"}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-outline-variant"><div className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none" style={{ width: percent + "%" }} /></div>
              <p className="mt-2 text-[11px] text-muted">{goal.detail}{goal.name === "Alimentação" ? " · valores estimados" : ""}</p>
            </Link>
          })}
        </div>}
    </SectionCard>
    <div className="lg:col-span-2">
      <SectionCard title="Ações assistidas" description="Contexto por módulo, com revisão humana antes de qualquer gravação" icon={<Sparkles className="size-5 text-primary" />}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {suggestions.map((item) => <button key={item.module} type="button" disabled={!live}
            onClick={() => assistant.openFor(item.module, item.prompt)}
            className="group flex min-h-28 flex-col items-start rounded-xl border border-outline-variant bg-surface/50 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50">
            <span className="flex w-full items-center justify-between gap-2 text-sm font-semibold text-on-surface">{item.title}<ArrowUpRight className="size-4 text-primary transition-transform group-hover:translate-x-0.5" /></span>
            <span className="mt-2 text-xs leading-5 text-muted">{item.context}</span>
            <span className="mt-auto pt-2 text-[10px] font-semibold text-primary">Preparar sugestão</span>
          </button>)}
        </div>
        <p className="mt-3 border-t border-outline-variant pt-3 text-[11px] leading-5 text-muted">
          A seleção apenas preenche o campo do agente correspondente. O envio depende de você e ações de escrita continuam exigindo prévia e confirmação.
        </p>
      </SectionCard>
    </div>
  </section>
}
