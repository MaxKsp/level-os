import { useState, type FormEvent } from "react"
import { ArrowDownToLine, PackageCheck } from "lucide-react"
import { SectionCard } from "../../design-system"
import { Button } from "../../components/ui/button"
import { LevelDateInput } from "../../components/ui/LevelDateInput"
import { LevelSelect } from "../../components/ui/LevelSelect"
import type { DietPlan } from "./store"
import { newWorkspaceId, type NutritionWorkspace, type PantryItem } from "./nutritionWorkspace"
import { coverageText, inventoryCoverage, parseShoppingQuantity } from "./nutritionInventory"

type Props = {
  key?: string
  plan: DietPlan
  workspace: NutritionWorkspace
  save: (operation: string, changes?: Record<string, unknown>) => Promise<NutritionWorkspace>
}
const units: PantryItem["unit"][] = ["un", "g", "kg", "ml", "l", "pacote"]
const localDate = () => new Date().toLocaleDateString("sv-SE")

/** A seleção do carrinho NÃO significa compra nem cria estoque por conta própria. */
export function NutritionInventoryBridge({ plan, workspace, save }: Props) {
  const items = plan.shoppingList ?? []
  const [index, setIndex] = useState("")
  const [quantity, setQuantity] = useState("")
  const [unit, setUnit] = useState<PantryItem["unit"]>("un")
  const [expiresOn, setExpiresOn] = useState("")
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState("")
  const selected = index === "" ? null : items[Number(index)]
  const choose = (value: string) => {
    setIndex(value)
    const selectedItem = items[Number(value)]
    const parsed = selectedItem ? parseShoppingQuantity(selectedItem.quantity) : null
    setQuantity(parsed ? String(parsed.value) : "")
    setUnit(parsed?.unit ?? "un")
    setExpiresOn("")
    setFeedback("")
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!selected || busy) return
    const amount = Number(quantity.replace(",", "."))
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) {
      setFeedback("Informe uma quantidade recebida entre 0,01 e 10.000.")
      return
    }
    setBusy(true); setFeedback("")
    try {
      const entry: PantryItem = {
        id: newWorkspaceId(), name: selected.item, quantity: amount, unit, category: selected.category,
        expiresOn: expiresOn || null,
      }
      await save("save_pantry", { items: [...workspace.pantry, entry] })
      setFeedback(selected.item + " adicionado à despensa. A compra continua independente do carrinho.")
      setIndex(""); setQuantity(""); setExpiresOn("")
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Falha ao atualizar a despensa.")
    } finally { setBusy(false) }
  }
  if (!items.length) return null
  const coverage = items.map((item) => inventoryCoverage(item, workspace.pantry, localDate()))
  const enough = coverage.filter((item) => item.status === "sufficient").length
  return <SectionCard title="Do planejamento à despensa"
    description="Compare o que falta, registre somente produtos recebidos e mantenha o saldo por unidade."
    icon={<PackageCheck className="size-5 text-primary" />}>
    <div className="mb-4 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-xs text-on-surface-variant">
      <strong className="text-on-surface">{enough}/{items.length} itens</strong> possuem quantidade estimada suficiente.
      A conferência é por nome exato normalizado, quantidade, unidade e validade; não modifica automaticamente a lista.
    </div>
    <ul aria-label="Conferência da lista e da despensa" className="grid gap-2 sm:grid-cols-2">
      {items.map((item, itemIndex) => <li key={itemIndex} className="min-w-0 rounded-lg border border-outline-variant bg-surface/65 p-3">
        <div className="flex items-start justify-between gap-2">
          <span className="min-w-0 text-sm font-semibold text-on-surface">{item.item}</span>
          <span className="shrink-0 text-xs tabular-nums text-muted">{item.quantity}</span>
        </div>
        <p className={"mt-1 text-xs " + (coverage[itemIndex].status === "sufficient" ? "text-primary" : "text-on-surface-variant")}>
          {coverageText(coverage[itemIndex])}</p>
        <button type="button" onClick={() => choose(String(itemIndex))}
          className="mt-2 min-h-9 rounded-lg border border-primary/25 px-2.5 text-xs font-semibold text-primary hover:bg-primary/10">
          Registrar entrada recebida
        </button>
      </li>)}
    </ul>
    <form onSubmit={(event) => void submit(event)} className="mt-5 grid gap-3 rounded-xl border border-outline-variant bg-surface-container p-4 sm:grid-cols-3">
      <div className="sm:col-span-3"><LevelSelect label="Produto efetivamente recebido" aria-label="Produto recebido"
        value={index} onChange={choose}
        options={[{ value: "", label: "Escolha um produto", disabled: true },
          ...items.map((item, index) => ({ value: String(index), label: item.item + " · " + item.quantity }))]} /></div>
      <label className="block text-xs font-semibold text-on-surface-variant">Quantidade recebida
        <input required inputMode="decimal" value={quantity} disabled={!selected || busy}
          onChange={(event) => setQuantity(event.target.value)}
          className="mt-1 min-h-11 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface outline-none focus:border-primary"
          placeholder="Ex.: 1,5" /></label>
      <LevelSelect label="Unidade" value={unit} disabled={!selected || busy} onChange={setUnit}
        options={units.map((value) => ({ value, label: value }))} />
      <LevelDateInput label="Validade (opcional)" value={expiresOn} disabled={!selected || busy}
        onChange={(event) => setExpiresOn(event.target.value)} />
      <p className="text-[11px] leading-5 text-muted sm:col-span-3">Confira quantidade e unidade na embalagem.
        Se o plano disser “1 bandeja” ou outra medida ambígua, informe o peso/unidade real.
        Itens adicionados ao carrinho não são compras concluídas nem entrada automática no estoque.</p>
      <div className="sm:col-span-3"><Button submit disabled={!selected || busy}>
        <ArrowDownToLine className="size-4" />{busy ? "Salvando…" : "Confirmar entrada na despensa"}</Button></div>
      {feedback ? <p role="status" className="text-xs text-on-surface sm:col-span-3">{feedback}</p> : null}
    </form>
  </SectionCard>
}
