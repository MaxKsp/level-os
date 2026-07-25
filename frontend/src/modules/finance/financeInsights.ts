import type { ExpenseLineV4, FinanceBootstrap } from "./contracts"
import { CATEGORY_LABEL } from "./categories"
import { formatCurrency } from "../../lib/format"
import { fromMoneyCents, toMoneyCents } from "../../lib/money"

export interface FinanceInsight {
  id: string
  tone: "warning" | "info" | "positive"
  icon: string
  title: string
  detail: string
}

const money = (cents: number) => formatCurrency(fromMoneyCents(cents))
const categoryLabel = (key: string) => CATEGORY_LABEL[key] ?? key
const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

/**
 * Insights financeiros proativos — o que o Assessor Fin destacaria sem o
 * usuário perguntar. Puro cliente, calculado dos lançamentos reais: pico de
 * categoria contra a média dos 3 meses anteriores, maior gasto do mês e total
 * preso em assinaturas mensais. Ordenados por relevância; até 3 são exibidos.
 */
export function financeInsights(data: FinanceBootstrap, now: Date = new Date()): FinanceInsight[] {
  const insights: FinanceInsight[] = []
  const expenses = data.expense_lines_v4
  const thisMonth = monthKey(now)
  const priorKeys = [1, 2, 3].map((i) => monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)))

  const catThisCents = new Map<string, number>()
  const catPriorByMonth = new Map<string, Map<string, number>>()
  for (const expense of expenses) {
    if (!expense.date) continue
    const mk = expense.date.slice(0, 7)
    const cat = expense.categoria?.trim() || "outros"
    const cents = toMoneyCents(expense.value)
    if (mk === thisMonth) {
      catThisCents.set(cat, (catThisCents.get(cat) ?? 0) + cents)
    } else if (priorKeys.includes(mk)) {
      const byMonth = catPriorByMonth.get(cat) ?? new Map<string, number>()
      byMonth.set(mk, (byMonth.get(mk) ?? 0) + cents)
      catPriorByMonth.set(cat, byMonth)
    }
  }

  // 1. Pico de categoria: >= 30% acima da média dos 3 meses anteriores e >= R$ 50.
  let spike: { cat: string; cur: number; avg: number; pct: number } | null = null
  for (const [cat, cur] of catThisCents) {
    const priorMonths = catPriorByMonth.get(cat)
    // Exige pelo menos 2 meses de histórico para não alarmar por base rasa,
    // e faz a média só sobre os meses com gasto (mês sem dado não deflaciona).
    if (!priorMonths || priorMonths.size < 2) continue
    const avg = [...priorMonths.values()].reduce((sum, value) => sum + value, 0) / priorMonths.size
    if (avg <= 0 || cur < 5000 || cur < avg * 1.3) continue
    const pct = ((cur - avg) / avg) * 100
    if (!spike || pct > spike.pct) spike = { cat, cur, avg, pct }
  }
  if (spike) {
    insights.push({
      id: "spike",
      tone: "warning",
      icon: "trending_up",
      title: `Gasto acima da média em ${categoryLabel(spike.cat)}`,
      detail: `${money(spike.cur)} este mês — ${Math.round(spike.pct)}% acima da média dos últimos 3 meses (${money(spike.avg)}).`,
    })
  }

  // 2. Maior gasto do mês (a partir de R$ 100).
  const thisMonthExpenses = expenses.filter((expense) => expense.date?.slice(0, 7) === thisMonth)
  const biggest = thisMonthExpenses.reduce<ExpenseLineV4 | null>((max, expense) => (!max || expense.value > max.value ? expense : max), null)
  if (biggest && biggest.value >= 100) {
    insights.push({
      id: "biggest",
      tone: "info",
      icon: "receipt_long",
      title: "Maior gasto do mês",
      detail: `${biggest.label || "Despesa"}: ${money(toMoneyCents(biggest.value))}${biggest.categoria ? ` · ${categoryLabel(biggest.categoria)}` : ""}.`,
    })
  }

  // 3. Assinaturas mensais ativas — dinheiro recorrente fácil de esquecer.
  const subscriptions = expenses.filter((expense) => expense.categoria === "assinaturas" && expense.recorrencia === "mensal")
  if (subscriptions.length > 0) {
    const totalCents = subscriptions.reduce((sum, expense) => sum + toMoneyCents(expense.value), 0)
    const names = subscriptions.map((expense) => expense.label).filter(Boolean).slice(0, 4).join(", ")
    insights.push({
      id: "subs",
      tone: "info",
      icon: "subscriptions",
      title: `${subscriptions.length} assinatura(s) ativa(s)`,
      detail: `${money(totalCents)}/mês${names ? ` · ${names}` : ""}. Revise o que não usa mais.`,
    })
  }

  return insights.slice(0, 3)
}
