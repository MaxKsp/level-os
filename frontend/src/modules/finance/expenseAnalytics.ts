import type { AccountV2, ExpenseLineV4 } from "./contracts"
import type { FinanceDateRange } from "./period"
import { isDateInRange, toLocalIso } from "./period"
import { fromMoneyCents, sumMoney, toMoneyCents } from "../../lib/money"

export type ExpenseGroupView = "category" | "account"

export interface ExpenseRankingItem {
  key: string
  label: string
  total: number
  percentage: number
  count: number
  expenses: ExpenseLineV4[]
}

export interface ExpenseTimelinePoint {
  key: string
  label: string
  total: number
}

function fromIso(value: string): Date {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function expensesInRange(expenses: ExpenseLineV4[], range: FinanceDateRange): ExpenseLineV4[] {
  return expenses.filter((expense) => isDateInRange(expense.date, range))
}

export function previousExpenseRange(range: FinanceDateRange): FinanceDateRange {
  const start = fromIso(range.start)
  const end = fromIso(range.end)
  const isCalendarMonth = start.getDate() === 1
    && end.getDate() === new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate()
    && start.getFullYear() === end.getFullYear()
    && start.getMonth() === end.getMonth()
  if (isCalendarMonth) {
    const previousStart = new Date(start.getFullYear(), start.getMonth() - 1, 1)
    const previousEnd = new Date(start.getFullYear(), start.getMonth(), 0)
    return { start: toLocalIso(previousStart), end: toLocalIso(previousEnd), label: "Período anterior" }
  }
  const days = Math.max(1, Math.round((Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86_400_000) + 1)
  const previousEnd = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1)
  const previousStart = new Date(previousEnd.getFullYear(), previousEnd.getMonth(), previousEnd.getDate() - (days - 1))
  return { start: toLocalIso(previousStart), end: toLocalIso(previousEnd), label: "Período anterior" }
}

export function expenseTotal(expenses: ExpenseLineV4[], range: FinanceDateRange): number {
  return sumMoney(expensesInRange(expenses, range).map((expense) => expense.value))
}

export function expenseRanking(
  expenses: ExpenseLineV4[],
  accounts: AccountV2[],
  range: FinanceDateRange,
  view: ExpenseGroupView,
): ExpenseRankingItem[] {
  const filtered = expensesInRange(expenses, range)
  const totalCents = filtered.reduce((sum, expense) => sum + toMoneyCents(expense.value), 0)
  const accountLabels = new Map(accounts.map((account) => [account.id, account.label]))
  const groups = new Map<string, { label: string; expenses: ExpenseLineV4[] }>()

  for (const expense of filtered) {
    const key = view === "category" ? expense.categoria?.trim() || "sem-categoria" : expense.accountId || "sem-conta"
    const label = view === "category"
      ? key === "sem-categoria" ? "Sem categoria" : key
      : key === "sem-conta" ? "Sem conta vinculada" : accountLabels.get(key) ?? "Conta removida"
    const group = groups.get(key) ?? { label, expenses: [] }
    group.expenses.push(expense)
    groups.set(key, group)
  }

  return [...groups.entries()]
    .map(([key, group]) => {
      const groupTotalCents = group.expenses.reduce((sum, expense) => sum + toMoneyCents(expense.value), 0)
      return { key, label: group.label, total: fromMoneyCents(groupTotalCents), percentage: totalCents > 0 ? (groupTotalCents / totalCents) * 100 : 0, count: group.expenses.length, expenses: group.expenses.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")) }
    })
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, "pt-BR"))
}

export function expenseTimeline(expenses: ExpenseLineV4[], range: FinanceDateRange): ExpenseTimelinePoint[] {
  const start = fromIso(range.start)
  const end = fromIso(range.end)
  const formatter = new Intl.DateTimeFormat("pt-BR", { month: "short", year: start.getFullYear() !== end.getFullYear() ? "2-digit" : undefined })
  const totals = new Map<string, number>()
  for (const expense of expensesInRange(expenses, range)) {
    if (!expense.date) continue
    const key = expense.date.slice(0, 7)
    totals.set(key, (totals.get(key) ?? 0) + toMoneyCents(expense.value))
  }
  const points: ExpenseTimelinePoint[] = []
  for (let cursor = new Date(start.getFullYear(), start.getMonth(), 1); cursor <= end; cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`
    points.push({ key, label: formatter.format(cursor).replace(".", ""), total: fromMoneyCents(totals.get(key) ?? 0) })
  }
  return points
}
