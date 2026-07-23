import { useEffect, useState } from "react"
import { History, RotateCcw, Trash2, UtensilsCrossed } from "lucide-react"
import { Button } from "../../components/ui/Button"
import { ConfirmIconAction } from "../../components/ui/IconAction"
import { EmptyState, SectionCard } from "../../design-system"
import { useAssistant } from "../assistant/store"
import { AssistantAvatar } from "../assistant/AssistantAvatar"
import { useNutrition } from "./store"

const GOAL_LABELS: Record<string, string> = {
  emagrecimento: "Emagrecimento",
  hipertrofia: "Hipertrofia",
  manutencao: "Manutenção",
}

const brl = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

export function NutritionScreen() {
  const nutrition = useNutrition()
  const assistant = useAssistant()
  const [openDay, setOpenDay] = useState(1)
  const plan = nutrition.plan

  useEffect(() => {
    if (plan && window.location.hash === "#nutrition-plan") {
      requestAnimationFrame(() => document.getElementById("nutrition-plan")?.scrollIntoView({ block: "start" }))
    }
  }, [plan])

  return (
    <main className="level-page mx-auto flex max-w-[1180px] flex-col gap-6 px-4 pb-24 pt-24 sm:px-6">
      <header className="level-page-header flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="level-page-title text-3xl font-semibold tracking-tight text-on-surface">Alimentação</h1>
          <p className="mt-3 text-on-surface-variant">Plano alimentar por objetivo, período e orçamento.</p>
        </div>
        <Button variant="primary" size="md" onClick={() => assistant.openFor("alimentacao")}>
          <AssistantAvatar module="alimentacao" className="size-4" />
          Cheff Rita
        </Button>
      </header>

      {nutrition.status === "error" ? (
        <div role="alert" className="rounded-lg border border-error/35 bg-error/5 px-4 py-3 text-sm text-error">
          Não foi possível carregar seu plano alimentar. <button className="ml-2 underline" onClick={() => void nutrition.refresh()}>Tentar novamente</button>
        </div>
      ) : null}

      {!plan ? (
        <SectionCard title="Seu plano alimentar" description="Nenhum plano ativo" bodyClassName="p-0">
          <EmptyState
            title="Nenhuma dieta montada"
            description="Diga à Cheff Rita seu objetivo, o período e quanto pode gastar. Ela monta o cardápio e grava aqui."
            icon="restaurant"
            action={<Button variant="primary" size="sm" onClick={() => assistant.openFor("alimentacao")}><AssistantAvatar module="alimentacao" className="size-4" />Cheff Rita</Button>}
          />
        </SectionCard>
      ) : (
        <div id="nutrition-plan" className="scroll-mt-24 space-y-6">
          <section className="grid border-y border-outline-variant sm:grid-cols-4" aria-label="Resumo do plano">
            {[
              { label: "Objetivo", value: GOAL_LABELS[plan.goal] ?? plan.goal },
              { label: "Período", value: `${plan.periodDays} dia(s)` },
              { label: "Orçamento", value: brl(plan.budgetBRL) },
              { label: "Custo estimado", value: brl(plan.estimatedCostBRL) },
            ].map((item) => (
              <div key={item.label} className="border-b border-outline-variant px-5 py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
                <p className="text-xl font-semibold text-on-surface">{item.value}</p>
                <p className="mt-1 text-sm text-muted">{item.label}</p>
              </div>
            ))}
          </section>

          <SectionCard
            title="Cardápio"
            description={plan.days.length < plan.periodDays ? `${plan.days.length} dia(s) de cardápio — repita a sequência até completar o período` : `${plan.days.length} dia(s)`}
            action={
              <ConfirmIconAction label="Excluir plano" title="Excluir plano alimentar?" description="O plano atual será removido. Você pode montar outro com a IA quando quiser." onConfirm={() => void nutrition.clear()}>
                <Trash2 className="size-4" />
              </ConfirmIconAction>
            }
            bodyClassName="p-0"
          >
            <div className="flex gap-1 overflow-x-auto border-b border-outline-variant px-3 pt-2" role="tablist" aria-label="Dias do cardápio">
              {plan.days.map((day) => (
                <button
                  key={day.day}
                  role="tab"
                  aria-selected={openDay === day.day}
                  onClick={() => setOpenDay(day.day)}
                  className={`min-h-10 shrink-0 border-b-2 px-4 text-sm font-semibold transition-colors ${openDay === day.day ? "border-primary text-on-surface" : "border-transparent text-muted hover:text-on-surface"}`}
                >
                  Dia {day.day}
                </button>
              ))}
            </div>
            <ul className="divide-y divide-outline-variant">
              {(plan.days.find((d) => d.day === openDay) ?? plan.days[0])?.meals.map((meal, index) => (
                <li key={index} className="flex items-start justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold text-on-surface">
                      <UtensilsCrossed className="size-4 shrink-0 text-primary" />
                      {meal.name}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-on-surface-variant">{meal.description}</p>
                  </div>
                  <span className="numeric-value shrink-0 text-sm text-muted">{brl(meal.estimatedCostBRL)}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

        </div>
      )}
      {nutrition.history.length > 0 ? (
        <SectionCard title="Histórico de planos" description={`${nutrition.history.length} versão(ões) arquivada(s)`} bodyClassName="p-0">
          <ul className="divide-y divide-outline-variant">
            {nutrition.history.map((item) => (
              <li key={item.id ?? item.createdAt} className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><History className="size-4" /></span>
                  <div className="min-w-0">
                    <p className="font-semibold text-on-surface">Versão {item.version ?? "anterior"} · {GOAL_LABELS[item.goal] ?? item.goal}</p>
                    <p className="mt-1 text-xs text-muted">{item.periodDays} dias · {brl(item.estimatedCostBRL)} · {item.createdAt ? new Date(item.createdAt).toLocaleDateString("pt-BR") : "data indisponível"}</p>
                  </div>
                </div>
                {item.id ? <Button variant="secondary" size="sm" onClick={() => void nutrition.restore(item.id!)}><RotateCcw className="size-4" />Restaurar</Button> : null}
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </main>
  )
}
