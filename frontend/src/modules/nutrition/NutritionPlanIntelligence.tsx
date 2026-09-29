import { useMemo } from "react"
import { AlertTriangle, ArrowUpRight, CalendarDays, ChefHat, Lightbulb } from "lucide-react"
import { SectionCard } from "../../design-system"
import type { DietPlan } from "./store"
import { nutritionPlanAnalytics } from "./nutritionPlanAnalytics"
const brl = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
export function NutritionPlanIntelligence({ plan, onSuggestion }: {
  plan: DietPlan; onSuggestion: (draft: string) => void
}) {
  const analysis = useMemo(() => nutritionPlanAnalytics(plan), [plan])
  const max = Math.max(1, ...analysis.days.map((day) => day.expectedCost))
  const prompts = [
    { title: "Ajustar orçamento", description: "Revisar estimativas e refeições.",
      text: `Revise meu cardápio de ${plan.periodDays} dias com orçamento de ${brl(plan.budgetBRL)}. O total informado é ${brl(analysis.declaredEstimate)}, mas a soma das refeições ao repetir a sequência é ${brl(analysis.summedEstimate)}. Explique a diferença e proponha ajustes econômicos; aguarde minha confirmação antes de substituir o plano.` },
    { title: "Preparar marmitas", description: "Otimizar tempo e quantidades.",
      text: "Use meu cardápio ativo para planejar o preparo antecipado das refeições, com sugestões de porcionamento, armazenamento seguro e organização da lista de compras. Não altere o plano automaticamente." },
    { title: "Alternativas mais baratas", description: "Substituir ingredientes caros.",
      text: "Analise o cardápio e sugira substituições acessíveis com objetivos e restrições que eu informar, mantendo variedade. Não invente preços, informe que devo confirmar valores locais e apresente a proposta antes de alterar o plano." },
    { title: "Dias de Liv Up", description: "Combinar refeições caseiras e prontas.",
      text: "Use meu plano alimentar para identificar quais refeições principais poderiam ser comparadas com marmitas prontas da Liv Up. Não suponha equivalência nutricional nem preços de catálogo; apresente critérios de comparação e um rascunho para minha aprovação." },
  ]
  return <section aria-label="Planejamento alimentar detalhado" className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
    <SectionCard title="Custo diário planejado" description="Soma das refeições estimadas, repetindo a sequência quando necessário" icon={<CalendarDays className="size-5 text-primary" />}>
      <div className="grid grid-cols-7 gap-1.5">
        {analysis.days.slice(0, 14).map((day) => <div key={day.day} className="min-w-0 space-y-2 text-center" title={`Dia ${day.day}: ${brl(day.expectedCost)} · ${day.meals} refeições`}>
          <div className="flex h-16 items-end rounded-lg border border-outline-variant bg-surface-container p-1">
            <div className="w-full rounded bg-primary/75" style={{ height: (day.expectedCost > 0 ? Math.max(10, day.expectedCost / max * 100) : 0) + "%" }} aria-hidden="true" />
          </div>
          <span className="block text-[10px] font-semibold tabular-nums text-muted">{day.day}</span>
        </div>)}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-outline-variant pt-3">
        <div><p className="text-[11px] text-muted">Soma prevista das refeições</p><p className="mt-1 text-lg font-semibold tabular-nums text-on-surface">{brl(analysis.summedEstimate)}</p></div>
        <div><p className="text-[11px] text-muted">Estimativa registrada no plano</p><p className="mt-1 text-lg font-semibold tabular-nums text-on-surface">{brl(analysis.declaredEstimate)}</p></div>
      </div>
      {analysis.days.length > 14 ? <p className="mt-2 text-[11px] text-muted">Exibidos 14 dos {analysis.days.length} dias; o total considera todo o período.</p> : null}
      {analysis.estimateMismatch ? <p role="note" className="mt-3 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-[11px] leading-5 text-on-surface-variant">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />Os dois totais estimados divergem em {brl(Math.abs(analysis.deltaVsDeclared))}. Peça à Chef Rita para revisar antes de usar como orçamento final.
      </p> : null}
      <p className="mt-3 text-[11px] leading-5 text-muted">Valores estimados pelo planejamento, não preços cotados ou gastos realizados. Macronutrientes só devem ser apresentados quando vierem de uma fonte identificada.</p>
    </SectionCard>
    <SectionCard title="Assistência ao cardápio" description="Sugestões contextuais que você revisa antes de aprovar" icon={<Lightbulb className="size-5 text-primary" />}>
      <div className="grid gap-2">
        {prompts.map((item) => <button key={item.title} type="button" onClick={() => onSuggestion(item.text)}
          className="group flex min-h-15 w-full items-center gap-3 rounded-lg border border-outline-variant bg-surface/60 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><ChefHat className="size-4" /></span>
          <span className="min-w-0 flex-1"><strong className="block text-xs font-semibold text-on-surface">{item.title}</strong><small className="mt-1 block text-[11px] text-muted">{item.description}</small></span>
          <ArrowUpRight className="size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
        </button>)}
      </div>
      <p className="mt-3 text-[11px] leading-5 text-muted">O atalho só prepara a mensagem na Chef Rita; não faz nenhuma compra, não edita o cardápio e não envia sem sua ação.</p>
    </SectionCard>
  </section>
}
