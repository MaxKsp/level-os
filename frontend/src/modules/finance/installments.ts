import { fromMoneyCents, toMoneyCents } from "../../lib/money"
import type { ExpenseLineV4, FinanceBootstrap } from "./contracts"

export interface InstallmentPurchase {
  id: string
  label: string
  accountLabel: string
  bank: string | null
  installmentAmount: number
  totalAmount: number
  paidInstallments: number
  totalInstallments: number
  remainingAmount: number
  nextDate: string | null
  completed: boolean
}

export interface InstallmentMonth {
  key: string
  label: string
  amount: number
  installments: number
}

export interface InstallmentSummary {
  purchases: InstallmentPurchase[]
  schedule: InstallmentMonth[]
  activePurchases: number
  totalRemaining: number
}

const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" })

function parseLocalIso(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.slice(0, 10))
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

function toLocalIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function addMonthsClamped(anchor: Date, amount: number): Date {
  const target = new Date(anchor.getFullYear(), anchor.getMonth() + amount, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  return new Date(target.getFullYear(), target.getMonth(), Math.min(anchor.getDate(), lastDay))
}

export function installmentOccurrenceDates(expense: ExpenseLineV4): string[] {
  const total = Math.max(0, Math.trunc(expense.parcelas ?? 0))
  const anchor = expense.date ? parseLocalIso(expense.date) : null
  if (!anchor || total < 2) return []
  return Array.from({ length: total }, (_, index) => toLocalIso(addMonthsClamped(anchor, index)))
}

export function expenseOccurrencesInRange(expense: ExpenseLineV4, start: string, end: string): string[] {
  if (!expense.date) return []
  const installments = installmentOccurrenceDates(expense)
  if (installments.length) return installments.filter((date) => date >= start && date <= end)
  if (expense.recorrencia !== "mensal") return expense.date >= start && expense.date <= end ? [expense.date] : []

  const anchor = parseLocalIso(expense.date)
  const first = parseLocalIso(start)
  const last = parseLocalIso(end)
  if (!anchor || !first || !last) return []
  const occurrences: string[] = []
  let offset = Math.max(0, (first.getFullYear() - anchor.getFullYear()) * 12 + first.getMonth() - anchor.getMonth())
  for (let guard = 0; guard < 600; guard += 1, offset += 1) {
    const occurrence = toLocalIso(addMonthsClamped(anchor, offset))
    if (occurrence > end) break
    if (occurrence >= start) occurrences.push(occurrence)
  }
  return occurrences
}

export function buildInstallmentSummary(data: FinanceBootstrap, now = new Date()): InstallmentSummary {
  const today = toLocalIso(new Date(now.getFullYear(), now.getMonth(), now.getDate()))
  const accountNames = new Map(data.accounts_v2.map((account) => [account.id, account.label]))
  const scheduleCents = new Map<string, { amount: number; installments: number }>()

  const purchases = data.expense_lines_v4.flatMap((expense): InstallmentPurchase[] => {
    const dates = installmentOccurrenceDates(expense)
    if (!dates.length) return []
    const installmentCents = toMoneyCents(expense.value)
    const paidInstallments = dates.filter((date) => date <= today).length
    const remainingInstallments = dates.length - paidInstallments
    const nextDate = dates.find((date) => date > today) ?? null

    for (const date of dates.filter((item) => item > today)) {
      const key = date.slice(0, 7)
      const current = scheduleCents.get(key) ?? { amount: 0, installments: 0 }
      scheduleCents.set(key, { amount: current.amount + installmentCents, installments: current.installments + 1 })
    }

    return [{
      id: expense.id,
      label: expense.label || "Compra parcelada",
      accountLabel: expense.accountId ? accountNames.get(expense.accountId) ?? expense.bank ?? "Conta não identificada" : expense.bank ?? "Conta não identificada",
      bank: expense.bank,
      installmentAmount: fromMoneyCents(installmentCents),
      totalAmount: fromMoneyCents(installmentCents * dates.length),
      paidInstallments,
      totalInstallments: dates.length,
      remainingAmount: fromMoneyCents(installmentCents * remainingInstallments),
      nextDate,
      completed: remainingInstallments === 0,
    }]
  }).sort((a, b) => Number(a.completed) - Number(b.completed) || (a.nextDate ?? "9999").localeCompare(b.nextDate ?? "9999"))

  const schedule = [...scheduleCents.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => {
    const date = parseLocalIso(`${key}-01`) ?? now
    return {
      key,
      label: monthLabel.format(date).replace(".", ""),
      amount: fromMoneyCents(item.amount),
      installments: item.installments,
    }
  })

  return {
    purchases,
    schedule,
    activePurchases: purchases.filter((purchase) => !purchase.completed).length,
    totalRemaining: fromMoneyCents(purchases.reduce((sum, purchase) => sum + toMoneyCents(purchase.remainingAmount), 0)),
  }
}
