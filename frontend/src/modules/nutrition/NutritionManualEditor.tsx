import { useMemo, useState, type FormEvent } from "react"
import { Check, CopyPlus, Plus, Trash2, Utensils } from "lucide-react"
import { Modal } from "../../components/ui/Modal"
import { Button } from "../../components/ui/button"
import type { DietPlan, ManualDietPayload, ShoppingCategory } from "./store"

type MealDraft = { name: string; description: string; cost: string }
type DayDraft = { meals: MealDraft[] }
type ItemDraft = { item: string; quantity: string; category: ShoppingCategory }
const newMeal = (): MealDraft => ({ name: "", description: "", cost: "0" })
const money = (text: string): number | null => {
  const normalized = text.trim()
  if (!/^\d+(?:[,.]\d{1,2})?$/.test(normalized)) return null
  const amount = Number(normalized.replace(",", "."))
  return Number.isFinite(amount) && amount >= 0 && amount <= 1_000_000 ? Math.round(amount * 100) / 100 : null
}
const makeId = () => "md_" + (typeof crypto !== "undefined" && "randomUUID" in crypto
  ? crypto.randomUUID().replaceAll("-", "")
  : Date.now().toString(36) + Math.random().toString(36).slice(2))
const field = "mt-1 min-h-10 w-full min-w-0 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
const moneyBRL = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const CATEGORY: Array<{ value: ShoppingCategory; label: string }> = [
  { value: "hortifruti", label: "Hortifrúti" }, { value: "proteina", label: "Proteínas" },
  { value: "mercearia", label: "Mercearia" }, { value: "laticinios", label: "Laticínios" },
  { value: "padaria", label: "Padaria" }, { value: "bebidas", label: "Bebidas" }, { value: "outros", label: "Outros" },
]

interface Props {
  initial: DietPlan | null
  hasActivePlan: boolean
  expectedActivePlanId: string | null
  onClose: () => void
  onSave: (value: ManualDietPayload) => Promise<void>
  key?: string
}
export function NutritionManualEditor({ initial, hasActivePlan, expectedActivePlanId, onClose, onSave }: Props) {
  const [draftId] = useState(makeId)
  const [goal, setGoal] = useState<DietPlan["goal"]>(initial?.goal ?? "manutencao")
  const [period, setPeriod] = useState(String(initial?.periodDays ?? 7))
  const [budget, setBudget] = useState(String(initial?.budgetBRL ?? 0))
  const [days, setDays] = useState<DayDraft[]>(() => initial?.days.length
    ? initial.days.map((day) => ({ meals: day.meals.map((meal) => ({
      name: meal.name, description: meal.description, cost: String(meal.estimatedCostBRL),
    })) }))
    : [{ meals: [newMeal()] }])
  const [activeDay, setActiveDay] = useState(0)
  const [ingredients, setIngredients] = useState<ItemDraft[]>(() =>
    (initial?.shoppingList ?? []).map((item) => ({ ...item })))
  const [replaceConfirmed, setReplaceConfirmed] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const periodCount = Number(period)
  const currentDay = Math.min(activeDay, Math.max(0, days.length - 1))
  const preview = useMemo(() => {
    if (!Number.isInteger(periodCount) || periodCount < 1 || periodCount > 30) return null
    const costs = days.map((day) => day.meals.reduce((sum: number | null, meal: MealDraft) => {
      const amount = money(meal.cost)
      return sum === null || amount === null ? null : sum + Math.round(amount * 100)
    }, 0))
    if (!costs.length || costs.some((cost) => cost === null)) return null
    return Array.from({ length: periodCount }, (_, index) => costs[index % costs.length] ?? 0)
      .reduce<number>((sum, value) => sum + (value ?? 0), 0) / 100
  }, [days, periodCount])
  const updateMeal = (index: number, patch: Partial<MealDraft>) => {
    setDays((current) => current.map((day, i) => i === currentDay
      ? { meals: day.meals.map((meal, j) => j === index ? { ...meal, ...patch } : meal) } : day))
  }
  const addDay = (duplicate = false) => {
    if (days.length >= periodCount || days.length >= 30) return
    setDays((current) => [...current, { meals: duplicate
      ? current[currentDay].meals.map((meal) => ({ ...meal }))
      : [newMeal()] }])
    setActiveDay(days.length)
  }
  const close = () => {
    if (saving) return
    if (!confirmLeave) { setConfirmLeave(true); return }
    onClose()
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (saving) return
    try {
      if (!Number.isInteger(periodCount) || periodCount < 1 || periodCount > 30 || days.length > periodCount) {
        throw new Error("O período deve ter entre 1 e 30 dias e comportar todos os dias cadastrados.")
      }
      const amount = money(budget)
      if (amount === null) throw new Error("Revise o orçamento. Use até duas casas decimais.")
      if (hasActivePlan && !replaceConfirmed) throw new Error("Confirme a substituição do plano ativo.")
      const cleanDays = days.map((day, index) => ({
        day: index + 1,
        meals: day.meals.map((meal) => {
          const cost = money(meal.cost)
          if (!meal.name.trim() || meal.name.trim().length > 64 || meal.description.trim().length > 500 || cost === null) {
            throw new Error(`Revise nome, descrição e custo de cada refeição do dia ${index + 1}.`)
          }
          return { name: meal.name.trim(), description: meal.description.trim(), estimatedCostBRL: cost }
        }),
      }))
      const shoppingList = ingredients.map((entry) => {
        if (!entry.item.trim() || entry.item.trim().length > 64 || !entry.quantity.trim() || entry.quantity.trim().length > 32) {
          throw new Error("Complete os ingredientes e as quantidades, ou remova as linhas vazias.")
        }
        return { item: entry.item.trim(), quantity: entry.quantity.trim(), category: entry.category }
      })
      setError("")
      setSaving(true)
      await onSave({ goal, periodDays: periodCount, budgetBRL: amount, days: cleanDays, shoppingList,
        manualDraftId: draftId, expectedActivePlanId, replaceConfirmed })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o plano.")
    } finally { setSaving(false) }
  }
  return <Modal isOpen onClose={close} maxWidth="max-w-4xl" icon="restaurant"
    title={initial ? "Editar plano manualmente" : "Montar plano manualmente"}
    description="Controle seu próprio cardápio, refeições e compras. Um novo salvamento cria uma versão restaurável.">
    <form onSubmit={(event) => void submit(event)} className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold text-muted">Objetivo
          <select className={field} value={goal} onChange={(event) => setGoal(event.target.value as DietPlan["goal"])}>
            <option value="manutencao">Manutenção</option><option value="emagrecimento">Emagrecimento</option>
            <option value="hipertrofia">Hipertrofia</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-muted">Período (dias)
          <input className={field} inputMode="numeric" type="number" min="1" max="30" required value={period}
            onChange={(event) => setPeriod(event.target.value)} />
        </label>
        <label className="text-xs font-semibold text-muted">Orçamento total (R$)
          <input className={field} inputMode="decimal" required value={budget} onChange={(event) => setBudget(event.target.value)}
            placeholder="Ex.: 350,00" />
        </label>
      </div>
      <section className="rounded-xl border border-outline-variant bg-surface/60">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant p-3 sm:p-4">
          <div><h3 className="text-sm font-semibold text-on-surface">Dias e refeições</h3>
            <p className="mt-1 text-[11px] text-muted">Se cadastrar menos dias que o período, a sequência se repetirá automaticamente.</p></div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" disabled={days.length >= periodCount || days.length >= 30}
              onClick={() => addDay(false)}><Plus className="size-3.5" />Adicionar dia</Button>
            <Button type="button" variant="ghost" size="sm" disabled={days.length >= periodCount || days.length >= 30}
              onClick={() => addDay(true)}><CopyPlus className="size-3.5" />Duplicar dia</Button>
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto border-b border-outline-variant px-3 pt-2" role="tablist" aria-label="Dias do editor">
          {days.map((_, index) => <button type="button" key={index} role="tab" aria-selected={currentDay === index}
            onClick={() => setActiveDay(index)}
            className={"min-h-10 shrink-0 border-b-2 px-3 text-xs font-semibold " + (currentDay === index
              ? "border-primary text-on-surface" : "border-transparent text-muted hover:text-on-surface")}>
            Dia {index + 1}
          </button>)}
        </div>
        <div className="space-y-3 p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong className="text-xs font-semibold text-on-surface">Refeições do dia {currentDay + 1}</strong>
            <button type="button" disabled={days.length <= 1} className="min-h-9 text-[11px] font-semibold text-muted hover:text-error disabled:opacity-40"
              onClick={() => { setDays((all) => all.filter((_, index) => index !== currentDay)); setActiveDay(Math.max(0, currentDay - 1)) }}>
              Remover este dia
            </button>
          </div>
          {days[currentDay]?.meals.map((meal, index) => <div key={index} className="space-y-2 rounded-lg border border-outline-variant bg-surface-container/70 p-3">
            <div className="flex items-center justify-between gap-2"><span className="text-[11px] font-semibold text-primary">REFEIÇÃO {index + 1}</span>
              <button type="button" disabled={days[currentDay].meals.length <= 1} aria-label={`Remover refeição ${index + 1}`}
                onClick={() => setDays((all) => all.map((day, dayIndex) => dayIndex === currentDay
                  ? { meals: day.meals.filter((_, mealIndex) => mealIndex !== index) } : day))}
                className="grid size-8 place-items-center text-muted hover:text-error disabled:opacity-40"><Trash2 className="size-4" /></button></div>
            <div className="grid gap-2 sm:grid-cols-[1fr_8rem]">
              <label className="min-w-0 text-xs text-muted">Nome da refeição
                <input className={field} maxLength={64} required aria-label={`Nome da refeição ${index + 1}`}
                  placeholder="Ex.: Almoço" value={meal.name} onChange={(event) => updateMeal(index, { name: event.target.value })} />
              </label>
              <label className="min-w-0 text-xs text-muted">Custo previsto (R$)
                <input className={field} inputMode="decimal" required aria-label={`Custo da refeição ${index + 1}`}
                  value={meal.cost} onChange={(event) => updateMeal(index, { cost: event.target.value })} />
              </label>
            </div>
            <label className="block text-xs text-muted">Alimentos e observações
              <textarea className={field + " min-h-20 resize-y"} maxLength={500} aria-label={`Descrição da refeição ${index + 1}`}
                value={meal.description} onChange={(event) => updateMeal(index, { description: event.target.value })}
                placeholder="Ex.: Arroz, feijão, frango e salada" />
            </label>
          </div>)}
          <Button type="button" variant="secondary" size="sm" disabled={days[currentDay].meals.length >= 8}
            onClick={() => setDays((all) => all.map((day, index) => index === currentDay
              ? { meals: [...day.meals, newMeal()] } : day))}><Plus className="size-3.5" />Adicionar refeição</Button>
        </div>
      </section>
      <section className="space-y-3 rounded-xl border border-outline-variant bg-surface/60 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h3 className="text-sm font-semibold text-on-surface">Lista de compras (opcional)</h3>
            <p className="mt-1 text-[11px] text-muted">Quantidades para todo o período; nenhum item é comprado automaticamente.</p></div>
          <Button type="button" variant="secondary" size="sm" disabled={ingredients.length >= 80}
            onClick={() => setIngredients((all) => [...all, { item: "", quantity: "", category: "outros" }])}>
            <Plus className="size-3.5" />Ingrediente
          </Button>
        </div>
        {ingredients.map((ingredient, index) => <div key={index} className="grid items-end gap-2 rounded-lg border border-outline-variant p-2 sm:grid-cols-[1fr_7rem_9rem_2rem]">
          <label className="text-[11px] text-muted">Ingrediente
            <input className={field} maxLength={64} required placeholder="Ex.: Arroz" value={ingredient.item}
              aria-label={`Ingrediente ${index + 1}`}
              onChange={(event) => setIngredients((all) => all.map((item, i) => i === index ? { ...item, item: event.target.value } : item))} />
          </label>
          <label className="text-[11px] text-muted">Quantidade
            <input className={field} maxLength={32} required placeholder="Ex.: 1 kg" value={ingredient.quantity}
              aria-label={`Quantidade do ingrediente ${index + 1}`}
              onChange={(event) => setIngredients((all) => all.map((item, i) => i === index ? { ...item, quantity: event.target.value } : item))} />
          </label>
          <label className="text-[11px] text-muted">Categoria
            <select className={field} aria-label={`Categoria do ingrediente ${index + 1}`} value={ingredient.category}
              onChange={(event) => setIngredients((all) => all.map((item, i) => i === index
                ? { ...item, category: event.target.value as ShoppingCategory } : item))}>
              {CATEGORY.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <button type="button" aria-label={`Remover ingrediente ${index + 1}`} className="grid size-9 place-items-center text-muted hover:text-error"
            onClick={() => setIngredients((all) => all.filter((_, i) => i !== index))}><Trash2 className="size-4" /></button>
        </div>)}
      </section>
      <section className="rounded-xl border border-primary/25 bg-primary/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-[10px] font-semibold uppercase tracking-widest text-primary">Prévia do orçamento</p>
            <p className="mt-1 text-[11px] leading-5 text-muted">Soma das refeições, repetindo os dias cadastrados até completar o período.</p></div>
          <strong className="text-xl font-semibold tabular-nums text-on-surface">{preview === null ? "Revise os custos" : moneyBRL(preview)}</strong>
        </div>
        {preview !== null && money(budget) !== null ? <p className="mt-2 text-[11px] text-muted">
          Orçamento definido: {moneyBRL(money(budget)!)} · diferença estimada: {moneyBRL(money(budget)! - preview)}.
          Os preços são estimados, não pagos nem cotados em fornecedores.
        </p> : null}
      </section>
      {hasActivePlan ? <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs leading-5 text-on-surface">
        <input type="checkbox" checked={replaceConfirmed} onChange={(event) => setReplaceConfirmed(event.target.checked)}
          className="mt-1 size-4 accent-primary" aria-label="Confirmar substituição do plano atual" />
        Confirmo que quero substituir o plano ativo. O anterior será arquivado no histórico e poderá ser restaurado.
      </label> : null}
      {error ? <p role="alert" className="rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">{error}</p> : null}
      {confirmLeave ? <div role="alertdialog" aria-label="Sair sem salvar" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/30 p-3">
        <p className="flex-1 text-xs text-on-surface">Seu rascunho manual não foi salvo. Deseja descartá-lo?</p>
        <Button type="button" variant="secondary" size="sm" onClick={() => setConfirmLeave(false)}>Continuar editando</Button>
        <Button type="button" variant="destructive" size="sm" onClick={onClose}>Descartar rascunho</Button>
      </div> : null}
      <footer className="flex flex-wrap justify-end gap-2 border-t border-outline-variant pt-4">
        <Button type="button" variant="ghost" disabled={saving} onClick={close}>Cancelar</Button>
        <Button type="submit" variant="primary" disabled={saving || (hasActivePlan && !replaceConfirmed)}>
          <Check className="size-4" />{saving ? "Salvando no Level OS..." : initial ? "Salvar nova versão" : "Criar plano manualmente"}
        </Button>
      </footer>
    </form>
  </Modal>
}
