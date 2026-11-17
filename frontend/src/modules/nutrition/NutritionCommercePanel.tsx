import { useMemo, useState } from "react"
import { ArrowUpRight, ClipboardCheck, Copy, ExternalLink, ShoppingBasket, Tag, Truck, Utensils } from "lucide-react"
import { SectionCard } from "../../design-system"
import { Button } from "../../components/ui/button"
import type { DietPlan, ShoppingItem } from "./store"
import { LIVUP_PROMOTION, mealComparisonGuide, NUTRITION_PARTNERS, shoppingGuide, simulateLivupDiscount } from "./nutritionCommerce"

const brl = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
interface Props { plan: DietPlan | null; items?: ShoppingItem[]; purchased?: ReadonlySet<number> }
const LINK_CLASS = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary px-3 text-xs font-semibold text-on-primary transition-colors hover:bg-primary/90"
export function NutritionCommercePanel({ plan, items = [], purchased = new Set() }: Props) {
  const [subtotal, setSubtotal] = useState("")
  const [feedback, setFeedback] = useState("")
  const pending = useMemo(() => shoppingGuide(items, purchased), [items, purchased])
  const guide = useMemo(() => plan ? mealComparisonGuide(plan) : "", [plan])
  const numeric = subtotal.trim() ? Number(subtotal.replace(",", ".")) : Number.NaN
  const simulation = simulateLivupDiscount(numeric)
  const copy = async (contents: string, success: string) => {
    if (!contents.trim()) { setFeedback("Não há itens disponíveis para copiar."); return }
    try { await navigator.clipboard.writeText(contents); setFeedback(success) }
    catch { setFeedback("O navegador não autorizou a cópia. Você pode selecionar o texto manualmente.") }
  }
  return <section aria-label="Onde comprar seus alimentos" className="space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><span className="text-[10px] font-semibold uppercase tracking-[.16em] text-primary">Food commerce</span>
        <h2 className="mt-1 text-xl font-semibold text-on-surface">Do planejamento à compra</h2>
        <p className="mt-1 text-xs leading-5 text-muted">Organize no Level OS e conclua seu pedido diretamente no fornecedor.</p>
      </div>
      <span className="rounded-full border border-outline-variant bg-surface px-3 py-1.5 text-[10px] font-medium text-muted">Compra externa · sem checkout integrado</span>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard className="h-full" title="Mercado e ingredientes" description="Leve a lista do seu cardápio ao iFood" icon={<ShoppingBasket className="size-5 text-primary" />}>
        <div className="space-y-4">
          <div className="rounded-xl border border-outline-variant bg-surface-container/50 p-4">
            <p className="text-xs font-semibold text-on-surface">iFood Mercado</p>
            <p className="mt-1 text-xs leading-5 text-on-surface-variant">Compare mercados disponíveis na sua região e use a função Lista de Compras do iFood.</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-primary/5 px-3 py-2">
              <span className="text-[11px] text-muted">{items.length - purchased.size} item(ns) pendente(s) no Level OS</span>
              <Button type="button" variant="secondary" size="sm" disabled={!pending} onClick={() => void copy(pending, "Lista pendente copiada. Cole no iFood e revise os produtos.")}>
                <Copy className="size-3.5" />Copiar lista
              </Button>
            </div>
          </div>
          <ol className="space-y-2 text-[11px] leading-5 text-muted">
            <li><strong className="text-primary">01.</strong> Copie os ingredientes pendentes.</li>
            <li><strong className="text-primary">02.</strong> No iFood, abra Mercados → Lista de Compras.</li>
            <li><strong className="text-primary">03.</strong> Procure os itens e compare preço, estoque, frete e substituições antes de pagar.</li>
          </ol>
          <a className={LINK_CLASS + " w-full"} target="_blank" rel="noopener noreferrer" href={NUTRITION_PARTNERS.ifood.website}>
            Abrir iFood <ExternalLink className="size-4" />
          </a>
          <p className="text-[10px] leading-4 text-muted">Sua lista não é enviada automaticamente. Preços e disponibilidade são definidos pelo mercado no iFood.</p>
        </div>
      </SectionCard>
      <SectionCard className="h-full" title="Refeições prontas" description="Marmitas para dias de rotina intensa" icon={<Utensils className="size-5 text-primary" />}>
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-xl border border-primary/25 bg-primary/5 p-4">
            <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-14 size-40 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs font-semibold text-on-surface">Liv Up</p>
                <p className="mt-1 text-xs text-on-surface-variant">Cupom compartilhado para experimentar na loja.</p></div>
              <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-bold text-primary">15% informado*</span>
            </div>
            <div className="relative mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-outline-variant bg-surface px-3 py-2">
              <code className="min-w-0 flex-1 break-all font-mono text-base font-semibold tracking-wide text-on-surface">{LIVUP_PROMOTION.code}</code>
              <Button variant="secondary" size="sm" type="button" onClick={() => void copy(LIVUP_PROMOTION.code, "Cupom copiado. Informe-o no checkout da Liv Up para validar a oferta.")}>
                <Copy className="size-3.5" />Copiar
              </Button>
            </div>
            <p className="relative mt-2 text-[10px] leading-4 text-muted">*Porcentagem informada pelo usuário, ainda não validada pelo fornecedor. Confira elegibilidade, validade e cumulatividade na finalização da compra.</p>
          </div>
          <div className="rounded-lg border border-outline-variant p-3">
            <label className="text-xs font-semibold text-on-surface" htmlFor="livup-cart-total">Simular economia no carrinho</label>
            <p className="mt-1 text-[11px] text-muted">Informe o subtotal que você encontrou na Liv Up (antes de taxas ou frete).</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted">R$</span>
              <input id="livup-cart-total" inputMode="decimal" value={subtotal} onChange={(event) => setSubtotal(event.target.value.slice(0, 15))}
                placeholder="Ex.: 250,00" className="min-h-10 min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-surface outline-none focus:border-primary" />
            </div>
            {subtotal.trim() && !simulation ? <p role="alert" className="mt-2 text-[11px] text-error">Informe um subtotal válido e não negativo.</p> : null}
            {simulation ? <div role="status" className="mt-3 grid grid-cols-2 gap-2 border-t border-outline-variant pt-3">
              <div><p className="text-[10px] text-muted">Economia hipotética (15%)</p><p className="mt-1 text-lg font-semibold tabular-nums text-primary">{brl(simulation.estimatedDiscount)}</p></div>
              <div><p className="text-[10px] text-muted">Total estimado após desconto</p><p className="mt-1 text-lg font-semibold tabular-nums text-on-surface">{brl(simulation.estimatedAfterDiscount)}</p></div>
              <p className="col-span-2 text-[10px] text-muted">Simulação matemática; não é cotação, preço final nem cupom validado. Frete e restrições não incluídos.</p>
            </div> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <a className={LINK_CLASS + " flex-1"} target="_blank" rel="noopener noreferrer" href={NUTRITION_PARTNERS.livup.website}>
              <Truck className="size-4" />Escolher marmitas <ArrowUpRight className="size-4" />
            </a>
            {guide ? <Button type="button" variant="secondary" size="sm" onClick={() => void copy(guide, "Ideias das refeições principais copiadas para comparação manual.")}>
              <ClipboardCheck className="size-3.5" />Copiar ideias
            </Button> : null}
          </div>
          <p className="text-[10px] leading-4 text-muted">Selecione produtos na Liv Up e aplique o código no campo “Cupom” da revisão do pedido. A compra continua no site deles.</p>
        </div>
      </SectionCard>
    </div>
    {feedback ? <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-on-surface-variant"><Tag className="size-4 shrink-0 text-primary" />{feedback}</div> : null}
  </section>
}
