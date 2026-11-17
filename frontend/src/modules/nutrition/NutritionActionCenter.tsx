import { AlertTriangle, ArrowRight, ChefHat, ListChecks, Receipt, Sparkles } from "lucide-react"
import type { DietPlan } from "./store"
import type { NutritionWorkspace } from "./nutritionWorkspace"
import { planWorkspaceId } from "./nutritionWorkspace"
import { inventoryCoverage } from "./nutritionInventory"

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const isoDate = (d: Date) => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"),
  String(d.getDate()).padStart(2, "0")].join("-")
const categoryName: Record<NutritionWorkspace["purchases"][number]["category"], string> = {
  mercado: "Mercado", restaurante: "Restaurante", marmita: "Marmitas", outros: "Outros",
}
type NavigateTo = "pantry" | "purchases" | "recipes" | "diary" | "preferences"

/** Priorizacao operacional por dados declarados; nenhum item e considerado comprado por estar no carrinho. */
export function nutritionActions(workspace: NutritionWorkspace, plan: DietPlan | null, now = new Date()) {
  const today = isoDate(now)
  const warningUntil = isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3))
  const weekStart = isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6))
  const stocked = workspace.pantry.filter((item) => item.quantity > 0)
  const expired = stocked.filter((item) => item.expiresOn && item.expiresOn < today)
  const expiring = stocked.filter((item) => item.expiresOn && item.expiresOn >= today && item.expiresOn <= warningUntil)
  const cart = plan ? workspace.cartChecks[planWorkspaceId(plan)] ?? {} : {}
  const pending = (plan?.shoppingList ?? []).map((item, index) => ({ ...item, index }))
    .filter(({ index }) => !cart[String(index)])
  const possibleAtHome = pending.filter((item) =>
    inventoryCoverage(item, workspace.pantry, today).status === "sufficient")
  const weekly = workspace.purchases.filter((item) => item.date >= weekStart && item.date <= today)
  const categorySpent = (Object.keys(categoryName) as (keyof typeof categoryName)[])
    .map((category) => ({ category, label: categoryName[category],
      amount: weekly.filter((item) => item.category === category).reduce((sum, item) => sum + item.amountBRL, 0) }))
  const weekTotal = categorySpent.reduce((sum, item) => sum + item.amount, 0)
  const quickRecipes = workspace.recipes.filter((item) => item.prepMinutes <= workspace.preferences.prepMinutes)
    .slice().sort((a, b) => a.prepMinutes - b.prepMinutes).slice(0, 3)
  return { today, weekStart, expired, expiring, pending, possibleAtHome, weekTotal, categorySpent, quickRecipes,
    inCart: (plan?.shoppingList ?? []).filter((_, index) => Boolean(cart[String(index)])).length, shoppingTotal: plan?.shoppingList?.length ?? 0 }
}
function ActionButton({ children, onClick }: { children: string; onClick: () => void }) {
  return <button type="button" onClick={onClick}
    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/5 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-primary">
    {children}<ArrowRight className="size-3.5" />
  </button>
}
interface Props {
  workspace: NutritionWorkspace
  plan: DietPlan | null
  onNavigate: (tab: NavigateTo) => void
  askRita: (text: string) => void
}
export function NutritionActionCenter({ workspace, plan, onNavigate, askRita }: Props) {
  const data = nutritionActions(workspace, plan)
  const alerts = [...data.expired.map((item) => ({ ...item, severity: "Vencido" })),
    ...data.expiring.map((item) => ({ ...item, severity: "Próximo" }))]
  const progress = data.shoppingTotal ? Math.round(data.inCart / data.shoppingTotal * 100) : 0
  return <section aria-label="Central de decisões alimentares" className="space-y-3">
    <header className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-4 sm:px-5">
      <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-primary"><Sparkles className="size-3.5" /> Sua próxima ação</p>
      <h3 className="mt-2 text-lg font-semibold text-on-surface">Planejar, comprar e aproveitar.</h3>
      <p className="mt-1 text-xs leading-5 text-muted">Ações baseadas na sua despensa, nas compras declaradas e no plano ativo. Sem números ilustrativos.</p>
    </header>
    <div className="grid gap-3 lg:grid-cols-2">
      <article className="rounded-xl border border-outline-variant bg-surface p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-on-surface"><AlertTriangle className="size-4 text-warning" /> Verificar a despensa</div>
        <p className="mt-1 text-xs text-muted">{data.expired.length} vencidos · {data.expiring.length} com validade em até 3 dias</p>
        {alerts.length ? <ul className="mt-3 divide-y divide-outline-variant">
          {alerts.slice(0, 5).map((item) => <li key={item.id} className="flex items-center justify-between gap-2 py-2 text-xs">
            <span className="min-w-0 truncate text-on-surface">{item.name}</span>
            <span className="shrink-0 text-muted">{item.severity} · {item.expiresOn?.split("-").reverse().join("/")}</span>
          </li>)}
        </ul> : <p className="mt-3 rounded-lg bg-primary/5 px-3 py-2 text-xs text-muted">Nenhum item com data de validade próxima entre os registros com quantidade positiva.</p>}
        <div className="mt-4"><ActionButton onClick={() => onNavigate("pantry")}>Gerenciar despensa</ActionButton></div>
      </article>
      <article className="rounded-xl border border-outline-variant bg-surface p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-on-surface"><ListChecks className="size-4 text-primary" /> Compras do plano</div>
        {plan ? <>
          <p className="mt-1 text-xs text-muted">{data.inCart}/{data.shoppingTotal} marcados no carrinho · {data.pending.length} pendentes</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-outline-variant" role="progressbar" aria-label="Itens marcados no carrinho"
            aria-valuemin={0} aria-valuemax={data.shoppingTotal} aria-valuenow={data.inCart}>
            <div className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none" style={{ width: progress + "%" }} />
          </div>
          <ul className="mt-2 space-y-1.5">{data.pending.slice(0, 4).map((item) => <li key={item.index} className="flex items-start justify-between gap-2 text-xs text-muted">
            <span className="truncate text-on-surface">{item.item}</span>
            <span className="shrink-0">{item.quantity}</span>
          </li>)}</ul>
          {data.possibleAtHome.length ? <p className="mt-3 text-xs text-primary">{data.possibleAtHome.length} item(ns) pendente(s) têm estoque estimado suficiente em unidades compatíveis.</p> : null}
          <p className="mt-3 text-[11px] text-muted">Itens no carrinho não representam pagamentos ou estoque recebido.</p>
        </> : <p className="mt-3 text-xs text-muted">Crie um plano alimentar para acompanhar a lista de compras aqui.</p>}
        <div className="mt-4"><ActionButton onClick={() => onNavigate("pantry")}>Revisar o estoque</ActionButton></div>
      </article>
      <article className="rounded-xl border border-outline-variant bg-surface p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-on-surface"><Receipt className="size-4 text-primary" /> Para onde foi o dinheiro</div>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-on-surface">{brl(data.weekTotal)}</p>
        <p className="mt-1 text-xs text-muted">Compras registradas de {data.weekStart.split("-").reverse().join("/")} a {data.today.split("-").reverse().join("/")}</p>
        <div className="mt-4 space-y-3">
          {data.categorySpent.map(({ category, label, amount }) => <div key={category} className="space-y-1">
            <div className="flex justify-between gap-2 text-xs"><span className="text-muted">{label}</span><strong className="tabular-nums text-on-surface">{brl(amount)}</strong></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-outline-variant">
              <div className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
                style={{ width: (data.weekTotal ? amount / data.weekTotal * 100 : 0) + "%" }} />
            </div>
          </div>)}
        </div>
        {plan ? <p className="mt-3 text-[11px] text-muted">Estimativa do plano completo ({plan.periodDays} dias): {brl(plan.estimatedCostBRL)}. Períodos diferentes; valores não são diretamente comparáveis.</p> : null}
        <div className="mt-4"><ActionButton onClick={() => onNavigate("purchases")}>Ver compras</ActionButton></div>
      </article>
      <article className="rounded-xl border border-outline-variant bg-surface p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-on-surface"><ChefHat className="size-4 text-primary" /> Ideias para seu tempo</div>
        <p className="mt-1 text-xs text-muted">Receitas cadastradas em até {workspace.preferences.prepMinutes} minutos, segundo suas estimativas.</p>
        {data.quickRecipes.length ? <ul className="mt-3 divide-y divide-outline-variant">
          {data.quickRecipes.map((recipe) => <li key={recipe.id} className="flex items-center justify-between gap-2 py-2 text-xs">
            <span className="min-w-0 truncate font-semibold text-on-surface">{recipe.title}</span>
            <span className="shrink-0 text-muted">{recipe.prepMinutes} min · {recipe.portions} porções</span>
          </li>)}
        </ul> : <p className="mt-3 rounded-lg bg-primary/5 px-3 py-2 text-xs text-muted">Cadastre receitas ou ajuste o tempo disponível nas preferências para receber sugestões contextualizadas.</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <ActionButton onClick={() => onNavigate("recipes")}>Gerenciar receitas</ActionButton>
          <button type="button" onClick={() => workspace.preferences.shareWithRita ? askRita("Com base no meu plano ativo e nas informações que autorizei compartilhar, sugira alternativas práticas para aproveitar ingredientes. Não altere meu plano sem prévia para aprovação.") : onNavigate("preferences")}
            className="min-h-10 rounded-lg border border-outline-variant px-3 text-xs font-semibold text-on-surface hover:border-primary/25 hover:bg-primary/5">
            {workspace.preferences.shareWithRita ? "Perguntar à Rita" : "Configurar acesso da Rita"}
          </button>
        </div>
      </article>
    </div>
  </section>
}
