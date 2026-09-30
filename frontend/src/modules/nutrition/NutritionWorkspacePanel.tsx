import { useEffect, useMemo, useState, type FormEvent } from "react"
import { BookOpen, CalendarDays, Heart, LayoutDashboard, Minus, Package, Pencil, Plus, ScanLine, ShoppingCart, Trash2, Users, WandSparkles, X } from "lucide-react"
import { SectionCard } from "../../design-system"
import { Button } from "../../components/ui/button"
import { ConfirmIconAction } from "../../components/ui/IconAction"
import { LevelSelect } from "../../components/ui/LevelSelect"
import { LevelDateInput } from "../../components/ui/LevelDateInput"
import { NutritionActionCenter } from "./NutritionActionCenter"
import type { DietPlan, ShoppingCategory } from "./store"
import { inventoryCoverage } from "./nutritionInventory"
import { newWorkspaceId, type NutritionWorkspace, type PantryItem, type RecipeItem, type DiaryItem, type PurchaseItem, type FamilyItem, type NutritionPreferences } from "./nutritionWorkspace"

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const displayDate = (date: string | null) => date && /^\d{4}-\d{2}-\d{2}$/.test(date)
  ? date.slice(8, 10) + "/" + date.slice(5, 7) + "/" + date.slice(0, 4) : date ?? "—"
const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) }
const categories: ShoppingCategory[] = ["hortifruti", "proteina", "mercearia", "laticinios", "padaria", "bebidas", "outros"]
const inputClass = "min-h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface outline-none focus:border-primary"
const labelClass = "mb-1 block text-xs font-semibold text-on-surface-variant"
const tabs = [
  ["overview", "Prioridades", LayoutDashboard],
  ["diary", "Meu dia", CalendarDays], ["pantry", "Despensa", Package], ["recipes", "Receitas", BookOpen],
  ["purchases", "Compras", ShoppingCart], ["family", "Família", Users], ["preferences", "Memória", Heart], ["barcode", "Código de barras", ScanLine],
] as const
interface Props {
  plan: DietPlan | null; workspace: NutritionWorkspace | null; loading: boolean; error: string
  save: (operation: string, changes?: Record<string, unknown>) => Promise<NutritionWorkspace>
  refresh: () => Promise<void>
  askRita: (text: string) => void
}
export function NutritionWorkspacePanel({ plan, workspace, loading, error, save, refresh, askRita }: Props) {
  const [tab, setTab] = useState<(typeof tabs)[number][0]>("overview")
  const [pending, setPending] = useState(false)
  const [editing, setEditing] = useState({ diary: "", pantry: "", recipes: "", purchases: "" })
  const [consuming, setConsuming] = useState<{ id: string; quantity: string } | null>(null)
  const [notice, setNotice] = useState("")
  const [mealForm, setMealForm] = useState({ date: today(), title: "", portion: "", note: "" })
  const [pantryForm, setPantryForm] = useState({ name: "", quantity: "1", unit: "un" as PantryItem["unit"],
    category: "outros" as ShoppingCategory, expiresOn: "" })
  const [recipeForm, setRecipeForm] = useState({ title: "", prepMinutes: "30", portions: "2", ingredients: "", instructions: "" })
  const [purchaseForm, setPurchaseForm] = useState({ date: today(), description: "", amountBRL: "", category: "mercado" as PurchaseItem["category"] })
  const [familyForm, setFamilyForm] = useState({ label: "", portionFactor: "1" })
  const [favoriteDraft, setFavoriteDraft] = useState("")
  const [avoidDraft, setAvoidDraft] = useState("")
  const [preferences, setPreferences] = useState<NutritionPreferences>({
    favorites: [], avoids: [], notes: "", prepMinutes: 30, shareWithRita: false,
  })
  const [reviewNote, setReviewNote] = useState("")
  const [batchCount, setBatchCount] = useState(1)
  const [barcode, setBarcode] = useState("")
  const [barcodeInfo, setBarcodeInfo] = useState<null | { name: string; brands: string; quantity: string; kcal100g: number | null; proteins100g: number | null; source: string }>(null)
  const [barcodeMessage, setBarcodeMessage] = useState("")
  useEffect(() => {
    if (!workspace) return
    setPreferences(workspace.preferences)
    setFavoriteDraft(workspace.preferences.favorites.join(", "))
    setAvoidDraft(workspace.preferences.avoids.join(", "))
  }, [workspace?.preferences])
  const spent = useMemo(() => workspace?.purchases.reduce((total, item) => total + item.amountBRL, 0) ?? 0, [workspace?.purchases])
  const familyFactor = Math.max(1, workspace?.family.reduce((total, item) => total + item.portionFactor, 0) ?? 1)
  const itemsAtHome = useMemo(() => plan?.shoppingList?.filter((item) =>
    inventoryCoverage(item, workspace?.pantry ?? [], today()).status === "sufficient") ?? [],
  [plan, workspace?.pantry])
  const soon = workspace?.pantry.filter((i) => i.quantity > 0 && i.expiresOn && i.expiresOn <= new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)) ?? []
  const commit = async (op: string, changes: Record<string, unknown>): Promise<boolean> => {
    setPending(true); setNotice("")
    try { await save(op, changes); setNotice("Registros sincronizados com sua conta."); return true }
    catch (e) { setNotice(e instanceof Error ? e.message : "Não foi possível salvar."); return false }
    finally { setPending(false) }
  }
  const addDiary = async (e: FormEvent) => {
    e.preventDefault(); if (!workspace || !mealForm.title.trim()) return
    const previous = editing.diary ? workspace.diary.find((item) => item.id === editing.diary) : null
    if (editing.diary && !previous) { setNotice("Registro alterado em outro lugar. Atualize os dados."); return }
    const entry: DiaryItem = { id: previous?.id ?? newWorkspaceId(), ...mealForm, title: mealForm.title.trim() }
    const items = previous ? workspace.diary.map((item) => item.id === previous.id ? entry : item)
      : [entry, ...workspace.diary].slice(0, 180)
    if (await commit("save_diary", { items })) {
      setEditing((current) => ({ ...current, diary: "" }))
      setMealForm({ ...mealForm, title: "", portion: "", note: "" })
    }
  }
  const addPantry = async (e: FormEvent) => {
    e.preventDefault(); if (!workspace || !pantryForm.name.trim()) return
    const previous = editing.pantry ? workspace.pantry.find((item) => item.id === editing.pantry) : null
    if (editing.pantry && !previous) { setNotice("Item alterado em outro lugar. Atualize os dados."); return }
    const quantity = Number(pantryForm.quantity)
    if (!Number.isFinite(quantity) || quantity < 0 || (!previous && quantity === 0)) {
      setNotice("Informe uma quantidade válida. Novos itens precisam ter saldo positivo."); return
    }
    const entry: PantryItem = { id: previous?.id ?? newWorkspaceId(), name: pantryForm.name.trim(), quantity,
      unit: pantryForm.unit, category: pantryForm.category, expiresOn: pantryForm.expiresOn || null }
    const items = previous ? workspace.pantry.map((item) => item.id === previous.id ? entry : item)
      : [...workspace.pantry, entry]
    if (await commit("save_pantry", { items })) {
      setEditing((current) => ({ ...current, pantry: "" }))
      setPantryForm({ ...pantryForm, name: "", quantity: "1", expiresOn: "" })
    }
  }
  const addRecipe = async (e: FormEvent) => {
    e.preventDefault(); if (!workspace || !recipeForm.title.trim()) return
    const ingredients = recipeForm.ingredients.split("\n").map((line) => line.split("|").map((x) => x.trim()))
      .filter((parts) => parts[0] && parts[1]).slice(0, 24).map(([name, quantity]) => ({ name, quantity }))
    if (!ingredients.length) { setNotice("Informe ingrediente | quantidade, um por linha."); return }
    const previous = editing.recipes ? workspace.recipes.find((item) => item.id === editing.recipes) : null
    if (editing.recipes && !previous) { setNotice("Receita alterada em outro lugar. Atualize os dados."); return }
    const entry: RecipeItem = { id: previous?.id ?? newWorkspaceId(), title: recipeForm.title.trim(), ingredients,
      prepMinutes: Number(recipeForm.prepMinutes), portions: Number(recipeForm.portions), instructions: recipeForm.instructions }
    const items = previous ? workspace.recipes.map((item) => item.id === previous.id ? entry : item)
      : [entry, ...workspace.recipes]
    if (await commit("save_recipes", { items })) {
      setEditing((current) => ({ ...current, recipes: "" }))
      setRecipeForm({ ...recipeForm, title: "", ingredients: "", instructions: "" })
    }
  }
  const addPurchase = async (e: FormEvent) => {
    e.preventDefault(); if (!workspace || !purchaseForm.description.trim()) return
    const amountBRL = Number(purchaseForm.amountBRL.replace(",", "."))
    if (!Number.isFinite(amountBRL) || amountBRL <= 0) { setNotice("Informe um valor pago maior que zero."); return }
    const previous = editing.purchases ? workspace.purchases.find((item) => item.id === editing.purchases) : null
    if (editing.purchases && !previous) { setNotice("Compra alterada em outro lugar. Atualize os dados."); return }
    const entry: PurchaseItem = { id: previous?.id ?? newWorkspaceId(), date: purchaseForm.date, description: purchaseForm.description.trim(),
      amountBRL, category: purchaseForm.category }
    const items = previous ? workspace.purchases.map((item) => item.id === previous.id ? entry : item)
      : [entry, ...workspace.purchases]
    if (await commit("save_purchases", { items })) {
      setEditing((current) => ({ ...current, purchases: "" }))
      setPurchaseForm({ ...purchaseForm, description: "", amountBRL: "" })
    }
  }
  const addFamily = async (e: FormEvent) => {
    e.preventDefault(); if (!workspace || !familyForm.label.trim()) return
    const entry: FamilyItem = { id: newWorkspaceId(), label: familyForm.label.trim(), portionFactor: Number(familyForm.portionFactor) }
    if (await commit("save_family", { items: [...workspace.family, entry] })) setFamilyForm({ label: "", portionFactor: "1" })
  }
  const listFromText = (value: string) => value.split(/[,\n]/).map((word) => word.trim()).filter(Boolean).slice(0, 24)
  const remove = async (section: "diary" | "pantry" | "recipes" | "purchases" | "family", id: string) => {
    if (!workspace || pending) return
    const saved = await commit("save_" + section, { items: workspace[section].filter((item) => item.id !== id) })
    if (saved && editing[section as keyof typeof editing] === id && section !== "family") cancelEdit(section as "diary" | "pantry" | "recipes" | "purchases")
  }
  const beginEdit = (section: "diary" | "pantry" | "recipes" | "purchases", id: string) => {
    if (!workspace || pending) return
    setNotice("")
    setEditing((current) => ({ ...current, [section]: id }))
    if (section === "diary") {
      const item = workspace.diary.find((record) => record.id === id)
      if (item) setMealForm({ date: item.date, title: item.title, portion: item.portion, note: item.note })
    } else if (section === "pantry") {
      const item = workspace.pantry.find((record) => record.id === id)
      if (item) setPantryForm({ name: item.name, quantity: String(item.quantity),
        unit: item.unit, category: item.category, expiresOn: item.expiresOn ?? "" })
    } else if (section === "recipes") {
      const item = workspace.recipes.find((record) => record.id === id)
      if (item) setRecipeForm({ title: item.title, prepMinutes: String(item.prepMinutes),
        portions: String(item.portions), ingredients: item.ingredients.map((part) => part.name + " | " + part.quantity).join("\n"),
        instructions: item.instructions })
    } else {
      const item = workspace.purchases.find((record) => record.id === id)
      if (item) setPurchaseForm({ date: item.date, description: item.description, amountBRL: String(item.amountBRL), category: item.category })
    }
    requestAnimationFrame(() => document.getElementById("nutrition-" + section + "-form")?.scrollIntoView?.({ behavior: "smooth", block: "center" }))
  }
  const cancelEdit = (section: "diary" | "pantry" | "recipes" | "purchases") => {
    setEditing((current) => ({ ...current, [section]: "" }))
    if (section === "diary") setMealForm({ date: today(), title: "", portion: "", note: "" })
    else if (section === "pantry") setPantryForm({ name: "", quantity: "1", unit: "un", category: "outros", expiresOn: "" })
    else if (section === "recipes") setRecipeForm({ title: "", prepMinutes: "30", portions: "2", ingredients: "", instructions: "" })
    else setPurchaseForm({ date: today(), description: "", amountBRL: "", category: "mercado" })
  }
  const consumeStock = async (id: string) => {
    if (!workspace || !consuming || consuming.id !== id) return
    const item = workspace.pantry.find((entry) => entry.id === id)
    const amount = Number(consuming.quantity.replace(",", "."))
    if (!item || !Number.isFinite(amount) || amount <= 0 || amount > item.quantity) {
      setNotice("A baixa deve ser positiva e não pode exceder o saldo disponível."); return
    }
    const remaining = Math.round((item.quantity - amount) * 100) / 100
    if (await commit("save_pantry", { items: workspace.pantry.map((entry) =>
      entry.id === id ? { ...entry, quantity: remaining } : entry) })) setConsuming(null)
  }
  const savePrefs = async (e: FormEvent) => { e.preventDefault(); await commit("save_preferences", { preferences }) }
  const lookup = async (e: FormEvent) => {
    e.preventDefault(); setBarcodeInfo(null); setBarcodeMessage("")
    const code = barcode.replace(/\D/g, "")
    if (!/^(\d{8}|\d{12,14})$/.test(code)) { setBarcodeMessage("Informe GTIN/EAN de 8, 12, 13 ou 14 dígitos."); return }
    try {
      const response = await fetch("/api/nutrition-barcode.php?code=" + encodeURIComponent(code), { credentials: "same-origin" })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.product) { setBarcodeMessage(result?.message ?? "Produto não encontrado na base colaborativa."); return }
      setBarcodeInfo(result.product)
    } catch { setBarcodeMessage("Consulta indisponível. Confira a embalagem.") }
  }
  const scanPhoto = async (file?: File) => {
    if (!file) return
    type Detector = new (options: { formats: string[] }) => { detect: (image: ImageBitmap) => Promise<{ rawValue: string }[]> }
    const Ctor = (window as unknown as { BarcodeDetector?: Detector }).BarcodeDetector
    if (!Ctor || typeof createImageBitmap !== "function") { setBarcodeMessage("Leitura indisponível neste navegador. Digite o código."); return }
    try {
      const bitmap = await createImageBitmap(file)
      const found = await new Ctor({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] }).detect(bitmap)
      bitmap.close()
      if (found[0]?.rawValue) { setBarcode(found[0].rawValue); setBarcodeMessage("Código identificado. Clique em Consultar.") }
      else setBarcodeMessage("Nenhum código identificado. Tente uma foto mais nítida.")
    } catch { setBarcodeMessage("Não foi possível ler a foto. Digite o código manualmente.") }
  }
  return <section id="nutrition-workspace" aria-label="Gestão alimentar" className="scroll-mt-24 space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-primary">Alimentação 2.0</p>
        <h2 className="mt-1 text-xl font-semibold text-on-surface">Sua rotina alimentar</h2>
        <p className="mt-1 text-xs text-muted">Despensa, registros e custos sincronizados com sua conta.</p></div>
      <span className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-1.5 text-xs text-primary">{loading ? "Carregando…" : workspace ? "Sincronização ativa" : "Indisponível"}</span>
    </div>
    {error ? <div role="alert" className="rounded-lg border border-error/40 p-3 text-xs text-error">{error} <button className="ml-2 underline" onClick={() => void refresh()}>Tentar novamente</button></div> : null}
    {notice ? <p role="status" className="rounded-lg bg-primary/10 p-3 text-xs text-on-surface-variant">{notice}</p> : null}
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {[["Despensa", String(workspace?.pantry.length ?? "—") + " itens"], ["Diário", String(workspace?.diary.length ?? "—") + " registros"],
        ["Compras declaradas", brl(spent)], ["Porções em família", familyFactor.toLocaleString("pt-BR") + "×"]].map(([label,value]) =>
        <div key={label} className="rounded-lg border border-outline-variant bg-surface px-3 py-3"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums text-on-surface">{value}</p></div>)}
    </div>
    <div role="tablist" aria-label="Ferramentas alimentares" className="flex gap-1 overflow-x-auto border-b border-outline-variant">
      {tabs.map(([key, label, Icon]) => <button type="button" role="tab" key={key} aria-selected={tab === key}
        onClick={() => { setTab(key); setNotice("") }}
        className={"inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-xs font-semibold " +
          (tab === key ? "border-primary text-primary" : "border-transparent text-muted hover:text-on-surface")}>
        <Icon className="size-4" />{label}</button>)}
    </div>
    {!workspace ? <SectionCard title="Registros indisponíveis">Entre na sua conta para utilizar os recursos sincronizados.</SectionCard> : null}
    {workspace && tab === "overview" ? <NutritionActionCenter workspace={workspace} plan={plan} onNavigate={setTab} askRita={askRita} /> : null}
    {workspace && tab === "diary" ? <SectionCard title="Diário alimentar" description="Registros voluntários: não estimamos calorias a partir de descrições vagas.">
      <form id="nutrition-diary-form" onSubmit={(e) => void addDiary(e)} className="grid gap-3 sm:grid-cols-2">
        <div><LevelDateInput label="Data" required value={mealForm.date} onChange={(e) => setMealForm({ ...mealForm, date: e.target.value })} /></div>
        <label className={labelClass}>Refeição consumida<input required maxLength={100} placeholder="Ex.: arroz, feijão, frango" value={mealForm.title} className={inputClass} onChange={(e) => setMealForm({ ...mealForm, title: e.target.value })} /></label>
        <label className={labelClass}>Porção (opcional)<input maxLength={80} placeholder="Ex.: 1 prato" value={mealForm.portion} className={inputClass} onChange={(e) => setMealForm({ ...mealForm, portion: e.target.value })} /></label>
        <label className={labelClass}>Observação (opcional)<input maxLength={400} value={mealForm.note} className={inputClass} onChange={(e) => setMealForm({ ...mealForm, note: e.target.value })} /></label>
        <div className="flex flex-wrap gap-2 sm:col-span-2"><Button submit disabled={pending} size="sm">{editing.diary ? <Pencil className="size-4" /> : <Plus className="size-4" />}{editing.diary ? "Salvar alterações" : "Registrar refeição"}</Button>
          {editing.diary ? <Button type="button" variant="secondary" disabled={pending} size="sm" onClick={() => cancelEdit("diary")}>Cancelar edição</Button> : null}</div>
      </form>
      <ul className="mt-4 divide-y divide-outline-variant text-sm">{workspace.diary.slice(0, 30).map((item) =>
        <li key={item.id} className="flex items-start justify-between gap-3 py-3">
          <div className="min-w-0"><b>{item.title}</b><p className="text-xs text-muted">{displayDate(item.date)} · {item.portion || "Porção não informada"} · {item.note}</p></div>
          <div className="flex shrink-0 items-center gap-1"><button type="button" disabled={pending} aria-label={"Editar refeição " + item.title} onClick={() => beginEdit("diary", item.id)}
            className="grid size-9 place-items-center rounded-lg text-primary hover:bg-primary/10"><Pencil className="size-4" /></button>
            <ConfirmIconAction label={"Excluir refeição " + item.title} title="Excluir refeição?" description="Este registro será removido do diário." disabled={pending}
              onConfirm={() => void remove("diary", item.id)}><Trash2 className="size-4" /></ConfirmIconAction></div>
        </li>)}</ul>
      {!workspace.diary.length ? <p className="mt-3 text-xs text-muted">Nenhuma refeição registrada ainda.</p> : null}
      {plan ? <div className="mt-5 space-y-2 rounded-lg border border-primary/25 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary"><WandSparkles className="size-4" /> Revisão contextual pela Nutricionista Rita</div>
        <p className="text-xs leading-5 text-muted">A Rita pode analisar o plano ativo e preparar uma nova versão. Nenhuma alteração é aplicada sem prévia e aprovação.</p>
        <textarea rows={2} maxLength={480} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)}
          placeholder="Ex.: troque o jantar do dia 2 por uma alternativa prática e preserve as outras refeições." className={inputClass + " py-2"} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => askRita("Analise meu plano alimentar ativo e proponha melhorias práticas sem alterar nada.")}>Analisar plano</Button>
          <Button size="sm" disabled={!reviewNote.trim()} onClick={() => askRita("Refaça meu plano alimentar ativo mantendo objetivo, orçamento, período e todas as refeições que não mencionar. Ajuste somente: " + reviewNote)}>Preparar versão para aprovação</Button>
        </div>
      </div> : null}
    </SectionCard> : null}
    {workspace && tab === "pantry" ? <SectionCard title="Despensa inteligente" description="Controle os saldos declarados, edite itens e registre o que foi utilizado.">
      {soon.length ? <p role="status" className="mb-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-on-surface">
        Atenção: {soon.map((i) => i.name).join(", ")} com validade vencida ou próxima (até 3 dias). Confira a conservação e a embalagem.</p> : null}
      <form id="nutrition-pantry-form" onSubmit={(e) => void addPantry(e)} className="grid gap-2 sm:grid-cols-3">
        <label className={labelClass}>Ingrediente<input required maxLength={80} value={pantryForm.name} placeholder="Ex.: Frango" className={inputClass} onChange={(e) => setPantryForm({ ...pantryForm, name: e.target.value })} /></label>
        <label className={labelClass}>Quantidade<input required type="number" min={0} max={10000} step="0.01" value={pantryForm.quantity} className={inputClass} onChange={(e) => setPantryForm({ ...pantryForm, quantity: e.target.value })} /></label>
        <label className={labelClass}>Unidade<LevelSelect value={pantryForm.unit} onChange={(unit) => setPantryForm({ ...pantryForm, unit })} options={["un","g","kg","ml","l","pacote"].map((u) => ({ value: u as PantryItem["unit"], label: u }))} /></label>
        <label className={labelClass}>Categoria<LevelSelect value={pantryForm.category} onChange={(category) => setPantryForm({ ...pantryForm, category })} options={categories.map((c) => ({ value: c, label: c }))} /></label>
        <div><LevelDateInput label="Validade (opcional)" value={pantryForm.expiresOn} onChange={(e) => setPantryForm({ ...pantryForm, expiresOn: e.target.value })} /></div>
        <div className="flex flex-wrap items-end gap-2"><Button type="submit" disabled={pending} className="self-end">{editing.pantry ? <Pencil className="size-4" /> : <Plus className="size-4" />}{editing.pantry ? "Salvar item" : "Adicionar"}</Button>
          {editing.pantry ? <Button type="button" variant="secondary" disabled={pending} onClick={() => cancelEdit("pantry")}>Cancelar</Button> : null}</div>
      </form>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">{workspace.pantry.map((item) =>
        <li key={item.id} className="min-w-0 rounded-lg border border-outline-variant p-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0"><b>{item.name}</b><p className="text-xs text-muted">{item.quantity} {item.unit} · {item.category}
              {item.expiresOn ? " · Validade " + displayDate(item.expiresOn) : ""}</p></div>
            <div className="flex shrink-0 items-center gap-0.5">
              <button type="button" disabled={pending} aria-label={"Editar estoque de " + item.name} onClick={() => beginEdit("pantry", item.id)}
                className="grid size-9 place-items-center rounded-lg text-primary hover:bg-primary/10"><Pencil className="size-4" /></button>
              <button type="button" disabled={pending || item.quantity <= 0} aria-label={"Registrar consumo de " + item.name}
                onClick={() => setConsuming({ id: item.id, quantity: "" })}
                className="grid size-9 place-items-center rounded-lg text-primary hover:bg-primary/10 disabled:opacity-40"><Minus className="size-4" /></button>
              <ConfirmIconAction label={"Excluir estoque de " + item.name} title="Excluir item da despensa?"
                description="O produto será removido do seu estoque cadastrado." disabled={pending}
                onConfirm={() => void remove("pantry", item.id)}><Trash2 className="size-4" /></ConfirmIconAction>
            </div>
          </div>
          {consuming?.id === item.id ? <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-primary/25 bg-primary/5 p-2">
            <label className="min-w-0 flex-1 text-xs font-semibold text-on-surface">Quantidade utilizada ({item.unit})
              <input type="number" min="0.01" max={item.quantity} step="0.01" value={consuming.quantity}
                onChange={(event) => setConsuming({ id: item.id, quantity: event.target.value })}
                className={inputClass + " mt-1"} aria-label={"Quantidade utilizada de " + item.name} /></label>
            <Button type="button" size="sm" disabled={pending || !consuming.quantity} onClick={() => void consumeStock(item.id)}>Confirmar baixa</Button>
            <button type="button" aria-label="Cancelar baixa" onClick={() => setConsuming(null)} className="grid size-9 place-items-center rounded-lg text-muted"><X className="size-4" /></button>
            <p className="w-full text-[11px] text-muted">Apenas esta quantidade é descontada, sem inferir consumo a partir do check-in.</p>
          </div> : null}
        </li>)}</ul>
      {!workspace.pantry.length ? <p className="mt-3 text-xs text-muted">Cadastre o que você tem para a Rita sugerir aproveitamento quando autorizar o compartilhamento.</p> : null}
      {plan?.shoppingList?.length ? <div className="mt-4 rounded-lg border border-outline-variant bg-primary/5 p-3 text-xs">
        <b className="text-on-surface">Cruzamento com sua lista de compras</b>
        <p className="mt-1 text-muted">{itemsAtHome.length}/{plan.shoppingList.length} itens têm quantidade estimada suficiente com unidade compatível na despensa.</p>
        <p className="mt-1 text-muted">Estoque suficiente estimado: {itemsAtHome.length ? itemsAtHome.map((i) => i.item).join(", ") : "nenhum identificado"}.</p>
        <p className="mt-1 text-muted">Validade, nome e medidas são conferidos de forma conservadora; revise os registros reais antes de comprar.</p>
      </div> : null}
    </SectionCard> : null}
    {workspace && tab === "recipes" ? <SectionCard title="Receitas e marmitas" description="Receitas reutilizáveis e ingredientes.">
      <form id="nutrition-recipes-form" onSubmit={(e) => void addRecipe(e)} className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>Receita<input required maxLength={100} value={recipeForm.title} className={inputClass} onChange={(e) => setRecipeForm({ ...recipeForm, title: e.target.value })} /></label>
        <label className={labelClass}>Tempo em minutos<input required type="number" min={1} max={480} value={recipeForm.prepMinutes} className={inputClass} onChange={(e) => setRecipeForm({ ...recipeForm, prepMinutes: e.target.value })} /></label>
        <label className={labelClass}>Rendimento (porções)<input required type="number" min={1} max={24} value={recipeForm.portions} className={inputClass} onChange={(e) => setRecipeForm({ ...recipeForm, portions: e.target.value })} /></label>
        <label className={labelClass + " sm:col-span-2"}>Ingredientes (nome | quantidade por linha)<textarea rows={4} required className={inputClass + " py-2"} value={recipeForm.ingredients} onChange={(e) => setRecipeForm({ ...recipeForm, ingredients: e.target.value })} /></label>
        <label className={labelClass + " sm:col-span-2"}>Preparo<textarea rows={3} maxLength={1500} className={inputClass + " py-2"} value={recipeForm.instructions} onChange={(e) => setRecipeForm({ ...recipeForm, instructions: e.target.value })} /></label>
        <div className="flex flex-wrap gap-2 sm:col-span-2"><Button type="submit" disabled={pending}>{editing.recipes ? <Pencil className="size-4" /> : <Plus className="size-4" />}{editing.recipes ? "Salvar alterações" : "Salvar receita"}</Button>
          {editing.recipes ? <Button type="button" variant="secondary" disabled={pending} onClick={() => cancelEdit("recipes")}>Cancelar edição</Button> : null}</div>
      </form>
      <div className="mt-4 rounded-lg border border-outline-variant p-3"><label className={labelClass}>Para quantos dias preparar marmitas?<input type="number" min={1} max={14} value={batchCount} className={inputClass} onChange={(e) => setBatchCount(Math.max(1,Math.min(14,Number(e.target.value)||1)))} /></label>
        <p className="mt-2 text-xs text-muted">Meta ilustrativa: {Math.round(batchCount * familyFactor * 10)/10} porções por período, considerando os fatores familiares declarados. Ajuste quantidades de cada receita à capacidade de preparo e conservação.</p></div>
      <ul className="mt-3 space-y-2">{workspace.recipes.map((item) => <li key={item.id} className="rounded-lg border border-outline-variant p-3 text-sm">
        <div className="flex items-start justify-between gap-2"><b>{item.title}</b><div className="flex shrink-0 items-center gap-1">
          <button type="button" disabled={pending} aria-label={"Editar receita " + item.title} onClick={() => beginEdit("recipes", item.id)}
            className="grid size-9 place-items-center rounded-lg text-primary hover:bg-primary/10"><Pencil className="size-4" /></button>
          <ConfirmIconAction label={"Excluir receita " + item.title} title="Excluir receita?" description="Esta receita será removida das sugestões cadastradas."
            disabled={pending} onConfirm={() => void remove("recipes", item.id)}><Trash2 className="size-4" /></ConfirmIconAction></div></div>
        <p className="mt-1 text-xs text-muted">{item.portions} porções base · {item.prepMinutes} min base · {item.ingredients.length} ingredientes</p>
        <p className="mt-2 text-xs text-on-surface-variant">{item.ingredients.map((i) => i.name + " — " + i.quantity).join(" · ")}</p>
        <p className="mt-2 whitespace-pre-line text-xs text-muted">{item.instructions}</p>
        <p className="mt-2 text-xs text-primary">Para {batchCount} dia(s) e porções familiares, use aproximadamente {(batchCount * familyFactor / item.portions).toFixed(2)}× cada quantidade base.</p>
      </li>)}</ul>
    </SectionCard> : null}
    {workspace && tab === "purchases" ? <SectionCard title="Compras registradas" description="Informe apenas compras que você concluiu. Carrinho não é comprovante de pagamento.">
      <form id="nutrition-purchases-form" onSubmit={(e) => void addPurchase(e)} className="grid gap-3 sm:grid-cols-2">
        <div><LevelDateInput label="Data" required value={purchaseForm.date} onChange={(e) => setPurchaseForm({ ...purchaseForm, date: e.target.value })} /></div>
        <label className={labelClass}>Descrição<input required maxLength={120} placeholder="Ex.: compra do mercado" value={purchaseForm.description} className={inputClass} onChange={(e) => setPurchaseForm({ ...purchaseForm, description: e.target.value })} /></label>
        <label className={labelClass}>Valor pago (R$)<input required inputMode="decimal" value={purchaseForm.amountBRL} className={inputClass} onChange={(e) => setPurchaseForm({ ...purchaseForm, amountBRL: e.target.value })} /></label>
        <label className={labelClass}>Categoria<LevelSelect value={purchaseForm.category} onChange={(category) => setPurchaseForm({ ...purchaseForm, category })} options={(["mercado","restaurante","marmita","outros"] as PurchaseItem["category"][]).map((c) => ({ value: c, label: c }))} /></label>
        <div className="flex flex-wrap gap-2 sm:col-span-2"><Button type="submit" disabled={pending}>{editing.purchases ? <Pencil className="size-4" /> : <Plus className="size-4" />}{editing.purchases ? "Salvar alterações" : "Registrar compra"}</Button>
          {editing.purchases ? <Button type="button" variant="secondary" disabled={pending} onClick={() => cancelEdit("purchases")}>Cancelar edição</Button> : null}</div>
      </form>
      <p className="mt-4 text-sm text-muted">Total de compras registradas: {brl(spent)}. Previsão do cardápio: {plan ? brl(plan.estimatedCostBRL) : "sem plano"}.</p>
      <p className="mt-1 text-xs text-muted">Valores declarados, sem conciliação bancária; os períodos podem ser diferentes.</p>
      <ul className="mt-3 divide-y divide-outline-variant">{workspace.purchases.map((item) => <li key={item.id} className="flex items-center justify-between gap-2 py-3 text-sm">
        <div><b>{item.description}</b><p className="text-xs text-muted">{displayDate(item.date)} · {item.category} · {brl(item.amountBRL)}</p></div>
        <div className="flex shrink-0 items-center gap-1"><button type="button" disabled={pending} aria-label={"Editar compra " + item.description}
          onClick={() => beginEdit("purchases", item.id)}
          className="grid size-9 place-items-center rounded-lg text-primary hover:bg-primary/10"><Pencil className="size-4" /></button>
          <ConfirmIconAction label={"Excluir compra " + item.description} title="Excluir compra registrada?"
            description="Este lançamento será removido do total declarado." disabled={pending}
            onConfirm={() => void remove("purchases", item.id)}><Trash2 className="size-4" /></ConfirmIconAction></div>
      </li>)}</ul>
    </SectionCard> : null}
    {workspace && tab === "family" ? <SectionCard title="Modo familiar" description="Calcule rendimento por pessoa; nomes são apenas identificadores locais da conta, sem convite externo.">
      <form onSubmit={(e) => void addFamily(e)} className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>Pessoa ou perfil<input required maxLength={60} placeholder="Ex.: pessoa 1" value={familyForm.label} className={inputClass} onChange={(e) => setFamilyForm({ ...familyForm, label: e.target.value })} /></label>
        <label className={labelClass}>Fator de porção<input required type="number" min={0.5} max={4} step={0.1} value={familyForm.portionFactor} className={inputClass} onChange={(e) => setFamilyForm({ ...familyForm, portionFactor: e.target.value })} /></label>
        <Button type="submit" disabled={pending}>Adicionar ao planejamento</Button>
      </form>
      <ul className="mt-3 divide-y divide-outline-variant">{workspace.family.map((item) => <li key={item.id} className="flex justify-between gap-2 py-2 text-sm">
        <span>{item.label} · {item.portionFactor}×</span>
        <ConfirmIconAction label={"Remover " + item.label} title="Remover perfil familiar?"
          description="O perfil deixará de compor o multiplicador de porções." disabled={pending}
          onConfirm={() => void remove("family", item.id)}><Trash2 className="size-4" /></ConfirmIconAction>
      </li>)}</ul>
      <p className="mt-3 text-xs text-muted">Multiplicador familiar: {familyFactor.toFixed(1)}×. Ajuste as necessidades de cada pessoa quando necessário.</p>
    </SectionCard> : null}
    {workspace && tab === "preferences" ? <SectionCard title="Memória alimentar controlada" description="Cadastre escolhas voluntárias; nenhuma informação clínica é inferida automaticamente.">
      <form onSubmit={(e) => void savePrefs(e)} className="grid gap-3">
        <label className={labelClass}>Alimentos favoritos (separe por vírgula)<textarea rows={2} maxLength={1500} className={inputClass + " py-2"} value={favoriteDraft}
          onChange={(e) => { setFavoriteDraft(e.target.value); setPreferences((current) => ({ ...current, favorites: listFromText(e.target.value) })) }} /></label>
        <label className={labelClass}>Ingredientes que prefere evitar (separe por vírgula)<textarea rows={2} maxLength={1500} className={inputClass + " py-2"} value={avoidDraft}
          onChange={(e) => { setAvoidDraft(e.target.value); setPreferences((current) => ({ ...current, avoids: listFromText(e.target.value) })) }} /></label>
        <label className={labelClass}>Tempo disponível para preparo (min)<input type="number" min={5} max={240} required value={preferences.prepMinutes} className={inputClass}
          onChange={(e) => setPreferences({ ...preferences, prepMinutes: Number(e.target.value) })} /></label>
        <label className={labelClass}>Observações pessoais (não insira dados médicos sensíveis)<textarea rows={2} maxLength={500} value={preferences.notes} className={inputClass + " py-2"}
          onChange={(e) => setPreferences({ ...preferences, notes: e.target.value })} /></label>
        <label className="flex items-start gap-3 rounded-lg border border-primary/25 bg-primary/5 p-3 text-xs text-on-surface">
          <input type="checkbox" checked={preferences.shareWithRita} onChange={(e) => setPreferences({ ...preferences, shareWithRita: e.target.checked })} />
          <span>Autorizo a Nutricionista Rita a consultar estas preferências, minha despensa, diário e compras registradas. Posso revogar esta autorização a qualquer momento.</span></label>
        <div className="flex flex-wrap gap-2"><Button type="submit" disabled={pending}>Salvar preferências</Button>
          <Button type="button" variant="secondary" disabled={pending} onClick={() => void commit("save_preferences", { preferences: { favorites: [], avoids: [], notes: "", prepMinutes: 30, shareWithRita: false } })}>Apagar memória e revogar acesso da Rita</Button></div>
      </form>
    </SectionCard> : null}
    {tab === "barcode" ? <SectionCard title="Consultar código de barras" description="Fonte colaborativa Open Food Facts. Confira o rótulo do produto.">
      <form onSubmit={(e) => void lookup(e)} className="flex flex-wrap gap-2">
        <input inputMode="numeric" aria-label="Código EAN ou GTIN" placeholder="EAN / GTIN da embalagem" maxLength={14} value={barcode} className={inputClass + " flex-1"} onChange={(e) => setBarcode(e.target.value.replace(/\D/g,""))} />
        <Button type="submit">Consultar</Button>
      </form>
      <label className="mt-3 inline-flex items-center gap-2 text-xs text-primary">Ler de uma foto (se suportado)
        <input type="file" accept="image/*" capture="environment" className="max-w-48 text-xs" onChange={(e) => void scanPhoto(e.target.files?.[0])} /></label>
      {barcodeMessage ? <p role="status" className="mt-3 text-xs text-muted">{barcodeMessage}</p> : null}
      {barcodeInfo ? <div className="mt-4 rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm">
        <b>{barcodeInfo.name}</b><p className="text-xs text-muted">{barcodeInfo.brands} · {barcodeInfo.quantity}</p>
        <p className="mt-2 text-xs">Por 100g (se informado): {barcodeInfo.kcal100g ?? "—"} kcal · proteína {barcodeInfo.proteins100g ?? "—"}g.</p>
        <a target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-semibold text-primary underline" href={barcodeInfo.source}>Ver registro original</a>
        <p className="mt-2 text-[11px] text-muted">Base colaborativa, valores sujeitos a erros e variações. Não é orientação médica ou laudo nutricional.</p>
      </div> : null}
    </SectionCard> : null}
  </section>
}
