import { Bot, ChefHat, Clock3, Database, Dumbbell, ExternalLink } from "lucide-react"
import { useState, type ReactNode } from "react"
import type { AssistantApproval } from "./api"
import type { AssistantResponse } from "./contracts"
import type { AssistantModule } from "./store"
import { parseDietPlan } from "../nutrition/store"

interface ResultDetail { label: string; value: string }
export interface AssistantResultPresentation {
  details: ResultDetail[]
  destination: AssistantModule
  destinationLabel: string
}

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null

const text = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null
const number = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null
const brl = (value: unknown): string | null => {
  const parsed = number(value)
  return parsed === null ? null : parsed.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}
const date = (value: unknown): string | null => {
  const parsed = text(value)
  if (!parsed || !/^\d{4}-\d{2}-\d{2}$/.test(parsed)) return parsed
  const [year, month, day] = parsed.split("-")
  return `${day}/${month}/${year}`
}
const detail = (label: string, value: string | null): ResultDetail | null => value ? { label, value } : null
const compact = (values: Array<ResultDetail | null>): ResultDetail[] => values.filter((value): value is ResultDetail => value !== null)

export function assistantResultPresentation(response: AssistantResponse): AssistantResultPresentation | null {
  const data = record(response.data)
  if (!data || !response.action || !response.module || response.module === "query") return null

  switch (response.action) {
    case "add_expense":
      return { destination: "financeiro", destinationLabel: "Ver em Finanças", details: compact([
        detail("Valor", brl(data.value)), detail("Descrição", text(data.description)),
        detail("Categoria", text(data.category)), detail("Conta", text(data.account)), detail("Data", date(data.date)),
      ]) }
    case "add_income":
      return { destination: "financeiro", destinationLabel: "Ver em Finanças", details: compact([
        detail("Valor", brl(data.value)), detail("Tipo", text(data.type)), detail("Conta", text(data.account)), detail("Data", date(data.date)),
      ]) }
    case "add_transfer":
      return { destination: "financeiro", destinationLabel: "Ver em Finanças", details: compact([
        detail("Valor", brl(data.value)), detail("Origem", text(data.from)), detail("Destino", text(data.to)), detail("Data", date(data.date)),
      ]) }
    case "add_task": {
      const task = record(data.task)
      return task ? { destination: "agenda", destinationLabel: "Ver na Rotina", details: compact([
        detail("Tarefa", text(task.title)), detail("Data", date(task.date)), detail("Horário", text(task.time)),
      ]) } : null
    }
    case "create_workout": {
      const workout = record(data.workout)
      const exercises = Array.isArray(workout?.exercises) ? workout.exercises.length : null
      return workout ? { destination: "treinos", destinationLabel: "Ver em Treinos", details: compact([
        detail("Treino", text(workout.name)), detail("Foco", text(workout.focus)), detail("Exercícios", exercises === null ? null : String(exercises)),
      ]) } : null
    }
    case "create_workout_program": {
      const workouts = Array.isArray(data.workouts) ? data.workouts : []
      return { destination: "treinos", destinationLabel: "Ver programa", details: compact([
        detail("Fichas", String(workouts.length)), detail("Frequência", number(data.daysPerWeek) === null ? null : `${number(data.daysPerWeek)}x por semana`),
        detail("Local", text(data.location)),
      ]) }
    }
    case "log_measurement": {
      const measurement = record(data.measurement)
      const measured = number(measurement?.value)
      return measurement ? { destination: "treinos", destinationLabel: "Ver evolução", details: compact([
        detail("Medida", text(measurement.type)), detail("Valor", measured === null ? null : `${measured.toLocaleString("pt-BR")} ${text(measurement.unit) ?? ""}`.trim()),
        detail("Data", date(measurement.date)),
      ]) } : null
    }
    case "log_workout_session":
    case "log_cardio": {
      const session = record(data.session)
      const exercises = Array.isArray(session?.exercises) ? session.exercises.length : null
      return session ? { destination: "treinos", destinationLabel: "Ver sessão", details: compact([
        detail("Sessão", text(session.name)), detail("Data", date(session.date)), detail("Exercícios", exercises === null ? null : String(exercises)),
      ]) } : null
    }
    default:
      return null
  }
}

interface ResultCardProps {
  response: AssistantResponse
  onView: (module: AssistantModule) => void
  onRoute?: (module: AssistantModule, suggestedPrompt?: string) => void
  approval?: AssistantApproval
  onApprovalChange?: (approval: AssistantApproval) => void
}

export function AssistantResultCard({ response, onView, onRoute, approval, onApprovalChange }: ResultCardProps) {
  const [editing, setEditing] = useState(false)

  if (response.status === "routed" && response.action === "route_to_agent") {
    const data = record(response.data)
    const handoff = record(data?.handoff)
    const rawModule = text(handoff?.module) ?? response.module
    const module: AssistantModule | null = rawModule === "financeiro" || rawModule === "agenda" || rawModule === "treinos" || rawModule === "alimentacao" ? rawModule : null
    if (!module) return null
    const agent = text(handoff?.agent) ?? "especialista"
    const suggestedPrompt = text(handoff?.suggestedPrompt) ?? undefined
    return (
      <section className="mt-3 rounded-xl border border-primary/25 bg-primary/5 p-3" aria-label={`Direcionamento para ${agent}`}>
        <div className="flex items-start gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Bot className="size-4" /></span>
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-primary">Especialista recomendado</p>
            <h4 className="mt-0.5 text-xs font-semibold text-on-surface">{agent}</h4>
            <p className="mt-1 text-[11px] leading-5 text-muted">{text(handoff?.scope)}</p>
          </div>
        </div>
        <ResultButton icon={<ExternalLink className="size-4" />} label={`Conversar com ${agent}`} onClick={() => onRoute ? onRoute(module, suggestedPrompt) : onView(module)} />
      </section>
    )
  }

  if (response.action === "query") {
    const data = record(response.data)
    const sourceLabel = text(data?.sourceLabel) ?? "Dados do Level OS"
    const title = text(data?.title) ?? "Consulta"
    const period = record(data?.period)
    const primary = record(data?.primaryMetric)
    const destination = record(data?.destination)
    const rawModule = text(destination?.module)
    const module: AssistantModule | null = rawModule === "financeiro" || rawModule === "agenda" || rawModule === "treinos" || rawModule === "alimentacao" ? rawModule : null
    const asOf = text(data?.asOf)
    const updatedLabel = asOf && !Number.isNaN(Date.parse(asOf))
      ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(asOf))
      : "agora"
    const details = Array.isArray(data?.details) ? data.details.map(record).filter((item): item is Record<string, unknown> => item !== null) : []
    const chart = record(data?.chart)
    const chartItems = Array.isArray(chart?.items) ? chart.items.map(record).filter((item): item is Record<string, unknown> => item !== null) : []
    const maximum = Math.max(0, ...chartItems.map((item) => number(item.value) ?? 0))
    const format = (value: unknown, kind: unknown) => {
      const parsed = number(value)
      if (kind === "currency") return parsed === null ? "—" : brl(parsed)
      if (kind === "days") return parsed === null ? "—" : `${parsed.toLocaleString("pt-BR")} dias`
      return parsed === null ? text(value) ?? "—" : parsed.toLocaleString("pt-BR")
    }
    return (
      <section className="mt-3 rounded-xl border border-outline-variant bg-surface-container-low p-3" aria-label={title}>
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-[10px] font-medium text-primary">{sourceLabel}</p><h4 className="mt-0.5 text-xs font-semibold text-on-surface">{title}</h4></div>
          <span className="flex items-center gap-1 text-[9px] text-muted"><Database className="size-3" />Atualizado {updatedLabel}</span>
        </div>
        {primary ? <div className="mt-3 border-t border-outline-variant pt-3">
          <p className="numeric-value text-xl font-semibold text-on-surface">{format(primary.value, primary.format)}</p>
          <p className="mt-0.5 text-[10px] text-muted">{text(primary.label)}</p>
        </div> : null}
        {text(period?.label) ? <p className="mt-2 flex items-center gap-1 text-[10px] text-muted"><Clock3 className="size-3" />{text(period?.label)}</p> : null}
        {details.length ? <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-outline-variant pt-3">{details.map((item, index) => <div key={`${text(item.label)}-${index}`}><dt className="text-[9px] text-muted">{text(item.label)}</dt><dd className="numeric-value mt-0.5 text-xs font-medium text-on-surface">{format(item.value, item.format)}</dd></div>)}</dl> : null}
        {chartItems.length ? <div className="mt-3 space-y-2 border-t border-outline-variant pt-3" aria-label="Distribuição dos dados">{chartItems.map((item, index) => {
          const value = number(item.value) ?? 0
          return <div key={`${text(item.label)}-${index}`} className="text-[10px]"><div className="mb-1 flex justify-between gap-2"><span className="truncate text-on-surface-variant">{text(item.label)}</span><span className="numeric-value text-muted">{brl(value)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-surface-container-high"><div className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${maximum > 0 ? Math.max(3, value * 100 / maximum) : 0}%` }} /></div></div>
        })}</div> : null}
        {module ? <ResultButton icon={<ExternalLink className="size-4" />} label={text(destination?.label) ?? "Abrir módulo"} onClick={() => onView(module)} /> : null}
      </section>
    )
  }

  if (response.action === "create_diet_plan") {
    const data = record(response.data)
    const plan = parseDietPlan(approval?.draft ?? data?.plan)
    if (!plan) return null
    const mealCount = plan.days.reduce((total, day) => total + day.meals.length, 0)
    const minimumBudget = plan.budgetBRL * 0.9
    const maximumBudget = plan.budgetBRL * 1.1
    const outsideBudgetTolerance = plan.estimatedCostBRL < minimumBudget || plan.estimatedCostBRL > maximumBudget
    const updateMeal = (dayIndex: number, mealIndex: number, field: "name" | "description" | "estimatedCostBRL", value: string) => {
      if (!onApprovalChange) return
      const days = plan.days.map((day, currentDay) => ({
        ...day,
        meals: day.meals.map((meal, currentMeal) => currentDay === dayIndex && currentMeal === mealIndex
          ? { ...meal, [field]: field === "estimatedCostBRL" ? Math.max(0, Number(value) || 0) : value }
          : meal),
      }))
      const dailyCosts = days.map((day) => day.meals.reduce((sum, meal) => sum + meal.estimatedCostBRL, 0))
      const estimatedCostBRL = Array.from({ length: plan.periodDays }, (_, index) => dailyCosts[index % dailyCosts.length] ?? 0)
        .reduce((sum, cost) => sum + cost, 0)
      onApprovalChange({
        ...approval,
        draft: {
          goal: plan.goal,
          periodDays: plan.periodDays,
          budgetBRL: plan.budgetBRL,
          estimatedCostBRL,
          days,
          shoppingList: plan.shoppingList ?? [],
        },
      })
    }
    return (
      <div className="mt-3 border-t border-outline-variant pt-3">
        <div className="grid grid-cols-3 gap-3" aria-label="Resumo do plano alimentar">
          <div><p className="numeric-value font-semibold text-on-surface">{plan.periodDays}</p><p className="text-[10px] text-muted">dias</p></div>
          <div><p className="numeric-value font-semibold text-on-surface">{mealCount}</p><p className="text-[10px] text-muted">refeições</p></div>
          <div><p className="numeric-value font-semibold text-on-surface">{brl(plan.estimatedCostBRL)}</p><p className="text-[10px] text-muted">estimado · meta {brl(plan.budgetBRL)}</p></div>
        </div>
        {response.status === "confirmation" ? (
          <details className="mt-3 border-t border-outline-variant pt-3" open={editing || undefined}>
            <summary className="cursor-pointer text-xs font-semibold text-primary">Ver cardápio completo antes de aprovar</summary>
            {onApprovalChange ? <button type="button" onClick={() => setEditing((value) => !value)} className="mt-3 min-h-10 rounded-lg border border-outline-variant px-3 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container">{editing ? "Concluir edição" : "Editar refeições"}</button> : null}
            <div className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1">
              {plan.days.map((day, dayIndex) => (
                <section key={day.day} className="rounded-lg border border-outline-variant p-3">
                  <h4 className="text-xs font-semibold text-on-surface">Dia {day.day}</h4>
                  <ul className="mt-2 divide-y divide-outline-variant">
                    {day.meals.map((meal, index) => (
                      <li key={`${day.day}-${index}`} className="py-2 first:pt-0 last:pb-0">
                        {editing ? <div className="grid gap-2">
                          <label className="grid gap-1 text-[10px] text-muted">Refeição<input value={meal.name} onChange={(event) => updateMeal(dayIndex, index, "name", event.target.value)} className="min-h-10 rounded-lg border border-outline-variant bg-surface px-2 text-xs text-on-surface" /></label>
                          <label className="grid gap-1 text-[10px] text-muted">Descrição<textarea value={meal.description} onChange={(event) => updateMeal(dayIndex, index, "description", event.target.value)} className="min-h-16 rounded-lg border border-outline-variant bg-surface px-2 py-2 text-xs text-on-surface" /></label>
                          <label className="grid gap-1 text-[10px] text-muted">Custo estimado (R$)<input type="number" min="0" step="0.01" value={meal.estimatedCostBRL} onChange={(event) => updateMeal(dayIndex, index, "estimatedCostBRL", event.target.value)} className="numeric-value min-h-10 rounded-lg border border-outline-variant bg-surface px-2 text-xs text-on-surface" /></label>
                        </div> : <>
                          <div className="flex justify-between gap-3 text-xs"><strong>{meal.name}</strong><span className="numeric-value text-muted">{brl(meal.estimatedCostBRL)}</span></div>
                          <p className="mt-1 text-[11px] leading-5 text-muted">{meal.description}</p>
                        </>}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            {plan.shoppingList?.length ? (
              <section className="mt-3 border-t border-outline-variant pt-3">
                <h4 className="text-xs font-semibold text-on-surface">Lista de compras consolidada</h4>
                <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                  {plan.shoppingList.map((item, index) => (
                    <li key={`${item.category}-${item.item}-${index}`} className="flex justify-between gap-3 text-[11px] text-on-surface-variant">
                      <span className="truncate">{item.item}</span>
                      <span className="shrink-0 text-muted">{item.quantity}</span>
                    </li>
                  ))}
                </ul>
                {editing ? <p className="mt-2 text-[10px] text-muted">A lista sugerida é preservada ao editar refeições; confira as quantidades antes de aprovar.</p> : null}
              </section>
            ) : null}
            {outsideBudgetTolerance ? <p className="mt-3 rounded-lg bg-error/10 px-3 py-2 text-[11px] text-error">O custo deve ficar entre {brl(minimumBudget)} e {brl(maximumBudget)}. Ajuste as refeições antes de aprovar.</p> : null}
            {Boolean(data?.hasActivePlan) ? <p className="mt-3 rounded-lg bg-warning/10 px-3 py-2 text-[11px] text-on-surface">Ao aprovar, o plano atual será arquivado e poderá ser restaurado.</p> : null}
          </details>
        ) : <ResultButton icon={<ChefHat className="size-4" />} label="Ver cardápio completo" onClick={() => onView("alimentacao")} />}
      </div>
    )
  }

  if (response.action === "create_workout_program" && response.status === "confirmation") {
    const data = record(response.data)
    const draft = record(approval?.draft)
    const workoutSource = Array.isArray(draft?.workouts) ? draft.workouts : data?.workouts
    const workouts = Array.isArray(workoutSource) ? workoutSource.map(record).filter((item): item is Record<string, unknown> => item !== null) : []
    const current = Array.isArray(data?.currentWorkouts) ? data.currentWorkouts.map(record).filter((item): item is Record<string, unknown> => item !== null) : []
    const mode = approval?.mode ?? (Boolean(data?.hasActiveProgram) || current.length ? "replace_all" : "append")
    const selected = approval?.selectedWorkoutIds ?? []
    const updateWorkout = (workoutIndex: number, exerciseIndex: number | null, field: string, value: string) => {
      if (!onApprovalChange) return
      const nextWorkouts = workouts.map((workout, currentWorkout) => {
        if (currentWorkout !== workoutIndex) return workout
        if (exerciseIndex === null) return { ...workout, [field]: value }
        const exercises = Array.isArray(workout.exercises) ? workout.exercises.map(record).filter((item): item is Record<string, unknown> => item !== null) : []
        return { ...workout, exercises: exercises.map((exercise, currentExercise) => currentExercise === exerciseIndex
          ? { ...exercise, [field]: ["sets", "reps", "restSec"].includes(field) ? Math.max(1, Number(value) || 1) : value }
          : exercise) }
      })
      onApprovalChange({ ...approval, mode, selectedWorkoutIds: selected, draft: {
        focus: text(draft?.focus) ?? text(data?.focus) ?? "",
        daysPerWeek: number(draft?.daysPerWeek) ?? number(data?.daysPerWeek) ?? nextWorkouts.length,
        location: text(draft?.location) ?? text(data?.location) ?? "academia",
        workouts: nextWorkouts,
      } })
    }
    return (
      <div className="mt-3 border-t border-outline-variant pt-3">
        <div className="grid grid-cols-3 gap-3">
          <div><p className="numeric-value font-semibold">{workouts.length}</p><p className="text-[10px] text-muted">fichas</p></div>
          <div><p className="numeric-value font-semibold">{number(draft?.daysPerWeek) ?? number(data?.daysPerWeek) ?? workouts.length}x</p><p className="text-[10px] text-muted">por semana</p></div>
          <div><p className="font-semibold capitalize">{text(draft?.location) ?? text(data?.location) ?? "—"}</p><p className="text-[10px] text-muted">local</p></div>
        </div>
        <details className="mt-3 border-t border-outline-variant pt-3">
          <summary className="cursor-pointer text-xs font-semibold text-primary">Revisar exercícios e progressão</summary>
          {onApprovalChange ? <button type="button" onClick={() => setEditing((value) => !value)} className="mt-3 min-h-10 rounded-lg border border-outline-variant px-3 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container">{editing ? "Concluir edição" : "Editar ficha"}</button> : null}
          <div className="mt-3 max-h-64 space-y-3 overflow-y-auto pr-1">
            {workouts.map((workout, workoutIndex) => (
              <section key={`${text(workout.name)}-${workoutIndex}`} className="rounded-lg border border-outline-variant p-3">
                {editing ? <div className="grid gap-2">
                  <label className="grid gap-1 text-[10px] text-muted">Nome da ficha<input value={text(workout.name) ?? ""} onChange={(event) => updateWorkout(workoutIndex, null, "name", event.target.value)} className="min-h-10 rounded-lg border border-outline-variant bg-surface px-2 text-xs text-on-surface" /></label>
                  <label className="grid gap-1 text-[10px] text-muted">Foco<input value={text(workout.focus) ?? ""} onChange={(event) => updateWorkout(workoutIndex, null, "focus", event.target.value)} className="min-h-10 rounded-lg border border-outline-variant bg-surface px-2 text-xs text-on-surface" /></label>
                </div> : <><h4 className="flex items-center gap-2 text-xs font-semibold"><Dumbbell className="size-3.5 text-primary" />{text(workout.name) ?? `Ficha ${workoutIndex + 1}`}</h4><p className="mt-1 text-[11px] text-muted">{text(workout.focus)}</p></>}
                <ul className="mt-2 divide-y divide-outline-variant">
                  {(Array.isArray(workout.exercises) ? workout.exercises : []).map((raw, index) => {
                    const exercise = record(raw)
                    if (!exercise) return null
                    return <li key={index} className="py-1.5 text-[11px]">{editing ? <div className="grid grid-cols-3 gap-2">
                      <label className="col-span-3 grid gap-1 text-[10px] text-muted">Exercício<input value={text(exercise.name) ?? ""} onChange={(event) => updateWorkout(workoutIndex, index, "name", event.target.value)} className="min-h-10 rounded-lg border border-outline-variant bg-surface px-2 text-xs text-on-surface" /></label>
                      {([['sets','Séries'],['reps','Repetições'],['restSec','Descanso (s)']] as const).map(([key,label]) => <label key={key} className="grid gap-1 text-[9px] text-muted">{label}<input type="number" min="1" value={number(exercise[key]) ?? 1} onChange={(event) => updateWorkout(workoutIndex, index, key, event.target.value)} className="numeric-value min-h-10 min-w-0 rounded-lg border border-outline-variant bg-surface px-2 text-xs text-on-surface" /></label>)}
                    </div> : <div className="flex justify-between gap-3"><span>{text(exercise.name)}</span><span className="numeric-value text-muted">{number(exercise.sets) ?? "—"} × {number(exercise.reps) ?? "—"}{number(exercise.restSec) !== null ? ` · ${number(exercise.restSec)}s` : ""}</span></div>}</li>
                  })}
                </ul>
              </section>
            ))}
          </div>
        </details>
        {current.length > 0 && onApprovalChange ? (
          <fieldset className="mt-3 border-t border-outline-variant pt-3">
            <legend className="text-[11px] font-semibold text-on-surface">Como aplicar</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {([['replace_all','Substituir atual'],['append','Adicionar fichas'],['replace_selected','Trocar selecionadas']] as const).map(([value,label]) => (
                <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-outline-variant px-2.5 py-2 text-[11px]"><input type="radio" name={`approval-${response.actionToken}`} checked={mode===value} onChange={()=>onApprovalChange({ ...approval, mode:value, selectedWorkoutIds:selected })}/>{label}</label>
              ))}
            </div>
            {mode === "replace_selected" ? <div className="mt-2 grid gap-1.5">{current.map((workout) => {
              const id=text(workout.id); if (!id) return null
              return <label key={id} className="flex items-center gap-2 text-[11px] text-on-surface-variant"><input type="checkbox" checked={selected.includes(id)} onChange={(event)=>onApprovalChange({...approval,mode,selectedWorkoutIds:event.target.checked?[...selected,id]:selected.filter((item)=>item!==id)})}/>{text(workout.name)}</label>
            })}</div> : null}
          </fieldset>
        ) : null}
      </div>
    )
  }

  const presentation = assistantResultPresentation(response)
  if (!presentation || presentation.details.length === 0) return null
  return (
    <div className="mt-3 border-t border-outline-variant pt-3">
      <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
        {presentation.details.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-[10px] text-muted">{item.label}</dt>
            <dd className="truncate text-xs font-semibold text-on-surface">{item.value}</dd>
          </div>
        ))}
      </dl>
      {response.status !== "confirmation" ? <ResultButton icon={<ExternalLink className="size-4" />} label={presentation.destinationLabel} onClick={() => onView(presentation.destination)} /> : null}
    </div>
  )
}

function ResultButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-on-primary transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{icon}{label}</button>
}
