import { ArrowUpRight, CalendarDays, PiggyBank, Utensils } from "lucide-react"
import { Button } from "../../components/ui/button"
import { SectionCard } from "../../design-system"
import type { TrainingProgram } from "../training/contracts"
import type { DietPlan } from "./store"
import { dietBudget } from "./dietBudget"
const brl = (amount: number) => amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
interface Props {
  plan: DietPlan
  activeProgram: TrainingProgram | null
  onOpenLeo: () => void
}
export function NutritionPlanningPanel({ plan, activeProgram, onOpenLeo }: Props) {
  const budget = dietBudget(plan)
  const availableWidth = Math.min(100, Math.max(0, budget.usedPercent ?? 0))
  return <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
    <SectionCard title="Planejamento alimentar" description="Custos informados pelo plano; não são preços confirmados" icon={<PiggyBank className="size-5 text-primary" />}>
      <div className="grid gap-4 sm:grid-cols-3">
        <div><p className="text-xs text-muted">Média prevista por dia</p><p className="mt-2 text-xl font-semibold tabular-nums text-on-surface">{brl(budget.dailyAverage)}</p></div>
        <div><p className="text-xs text-muted">Custo do período</p><p className="mt-2 text-xl font-semibold tabular-nums text-on-surface">{brl(budget.totalEstimate)}</p></div>
        <div><p className="text-xs text-muted">{budget.overBudget ? "Acima do orçamento" : "Margem do orçamento"}</p>
          <p className={"mt-2 text-xl font-semibold tabular-nums " + (budget.overBudget ? "text-error" : "text-on-surface")}>{brl(Math.abs(budget.difference))}</p></div>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-outline-variant" role="progressbar" aria-label="Orçamento estimado utilizado" aria-valuemin={0} aria-valuemax={100} aria-valuenow={availableWidth}>
        <div className={"h-full rounded-full transition-[width] motion-reduce:transition-none " + (budget.overBudget ? "bg-error" : "bg-primary")} style={{ width: availableWidth + "%" }} />
      </div>
      <p className="mt-2 text-[11px] text-muted">{budget.usedPercent === null ? "Configure um orçamento para visualizar a proporção." : budget.usedPercent + "% do orçamento previsto."} O valor final depende da compra e do preparo.</p>
    </SectionCard>
    <SectionCard title="Alimentação + treinamento" description="Visão conjunta dos dois módulos — sem alterações automáticas" icon={<Utensils className="size-5 text-primary" />}>
      {activeProgram ? <>
        <p className="text-xs font-semibold text-on-surface">{activeProgram.name}</p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted"><CalendarDays className="size-3.5" />{activeProgram.daysPerWeek} dia(s) de treino por semana · {activeProgram.location}</p>
        <p className="mt-3 text-xs leading-5 text-on-surface-variant">Use esta referência ao conversar com os agentes. Chef Rita cuida do cardápio; Personal Léo, do treino.</p>
      </> : <p className="text-xs leading-5 text-muted">Nenhum programa ativo. O Personal Léo pode ajudar a organizar seus dias de treino antes de rever o cardápio com a Chef Rita.</p>}
      <Button type="button" variant="secondary" size="sm" className="mt-4 w-full sm:w-auto" onClick={onOpenLeo}>
        Conversar com Personal Léo <ArrowUpRight className="size-3.5" />
      </Button>
    </SectionCard>
  </div>
}
