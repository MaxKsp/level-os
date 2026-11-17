import type { AccountV2, FinanceBootstrap } from "./contracts"
import { financeSummary, isCard } from "./selectors"
import { toMoneyCents, fromMoneyCents } from "../../lib/money"

const DAY = 86_400_000
const validDate = (day: string | null | undefined): day is string => {
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false
  const timestamp = Date.parse(day + "T00:00:00Z")
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === day
}
const plusDays = (iso: string, delta: number) => new Date(Date.parse(iso + "T00:00:00Z") + delta * DAY).toISOString().slice(0, 10)
const upcomingDueDate = (card: AccountV2, today: string): string | null => {
  if (!card.vencimento || card.vencimento < 1 || card.vencimento > 31 || card.fatura <= 0 || !validDate(today)) return null
  const [year, month] = today.split("-").map(Number)
  for (let offset = 0; offset <= 1; offset++) {
    const first = new Date(Date.UTC(year, month - 1 + offset, 1))
    const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
    const candidate = first.toISOString().slice(0, 8) + String(Math.min(card.vencimento, lastDay)).padStart(2, "0")
    if (candidate >= today) return candidate
  }
  return null
}
export function financeControl(data: FinanceBootstrap, today: string) {
  if (!validDate(today)) throw new Error("Data de referência inválida")
  const knownAccounts = new Set(data.accounts_v2.map((account) => account.id))
  const unlinked = data.expense_lines_v4.filter((item) => item.accountId == null || !knownAccounts.has(item.accountId))
  const missingDates = data.expense_lines_v4.filter((item) => item.recorrencia !== "mensal" && !validDate(item.date))
  const summary = financeSummary(data)
  const dueCards = data.accounts_v2.filter(isCard).map((card) => ({ card, date: upcomingDueDate(card, today) }))
    .filter((entry): entry is { card: AccountV2; date: string } => entry.date !== null)
    .filter((entry) => entry.date <= plusDays(today, 14))
    .sort((a, b) => a.date.localeCompare(b.date))
  const expenses = data.expense_lines_v4.filter((item) => validDate(item.date) && item.date <= today)
  const heatmap = Array.from({ length: 28 }, (_, index) => {
    const date = plusDays(today, index - 27)
    const records = expenses.filter((item) => item.date === date)
    const amountCents = records.reduce((sum, item) => sum + toMoneyCents(item.value), 0)
    return { date, amount: fromMoneyCents(amountCents), count: records.length }
  })
  const monthStart = today.slice(0, 7) + "-01"
  const monthExpenses = expenses.filter((item) => item.date! >= monthStart)
  const monthCents = monthExpenses.reduce((sum, item) => sum + toMoneyCents(item.value), 0)
  const byCategory = new Map<string, number>()
  for (const item of monthExpenses) {
    const key = item.categoria?.trim() || "Sem categoria"
    byCategory.set(key, (byCategory.get(key) ?? 0) + toMoneyCents(item.value))
  }
  const largest = [...byCategory].sort((a, b) => b[1] - a[1])[0] ?? null
  return { summary, unlinked, missingDates, dueCards, heatmap,
    topCategory: largest && monthCents > 0 ? { category: largest[0], amount: fromMoneyCents(largest[1]), share: Math.round(largest[1] / monthCents * 100) } : null,
  }
}
