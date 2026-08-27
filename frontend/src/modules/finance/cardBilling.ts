import { fromMoneyCents, toMoneyCents } from "../../lib/money"
import type { AccountV2, ExpenseLineV4, FinanceBootstrap } from "./contracts"
import { expenseOccurrencesInRange, installmentOccurrenceDates } from "./installments"

export interface ChargeEstimate {
  amount: number
  count: number
}

export interface AfterClosingEstimate extends ChargeEstimate {
  fromDate: string
  toDate: string
  closingDate: string
  uncertainOnClosingDay: ChargeEstimate
}

export interface FutureInstallmentEstimate extends ChargeEstimate {
  nextDate: string | null
}

export interface CardBillingView {
  cardId: string
  informedInvoice: number
  informedLimit: number
  availableCredit: number
  overLimit: number
  usagePercentage: number | null
  afterClosing: AfterClosingEstimate | null
  futureInstallments: FutureInstallmentEstimate
}

export interface CardBillingSummary {
  cards: CardBillingView[]
  totalInformedInvoice: number
  totalInformedLimit: number
  totalAvailableCredit: number
  totalAfterClosingEstimate: number
  totalFutureInstallments: number
}

interface ClosingWindow {
  closingDate: string
  fromDate: string
  toDate: string
  uncertainDate: string
}

function toLocalIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function dateForMonth(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(day, lastDay))
}

function addDays(value: Date, amount: number): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate() + amount)
}

function resolveClosingWindow(closingDay: number | null, now: Date): ClosingWindow | null {
  if (!Number.isInteger(closingDay) || closingDay === null || closingDay < 1 || closingDay > 31) return null

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayIso = toLocalIso(today)
  const currentClosing = dateForMonth(today.getFullYear(), today.getMonth(), closingDay)
  const currentClosingIso = toLocalIso(currentClosing)
  const previousClosing = dateForMonth(today.getFullYear(), today.getMonth() - 1, closingDay)

  if (todayIso > currentClosingIso) {
    return {
      closingDate: currentClosingIso,
      fromDate: toLocalIso(addDays(currentClosing, 1)),
      toDate: todayIso,
      uncertainDate: currentClosingIso,
    }
  }

  if (todayIso === currentClosingIso) {
    return {
      closingDate: toLocalIso(previousClosing),
      fromDate: toLocalIso(addDays(previousClosing, 1)),
      toDate: toLocalIso(addDays(currentClosing, -1)),
      uncertainDate: currentClosingIso,
    }
  }

  const previousClosingIso = toLocalIso(previousClosing)
  return {
    closingDate: previousClosingIso,
    fromDate: toLocalIso(addDays(previousClosing, 1)),
    toDate: todayIso,
    uncertainDate: previousClosingIso,
  }
}

function estimateOccurrences(expenses: ExpenseLineV4[], start: string, end: string): ChargeEstimate {
  if (start > end) return { amount: 0, count: 0 }
  let amountCents = 0
  let count = 0

  for (const expense of expenses) {
    const occurrences = expenseOccurrencesInRange(expense, start, end)
    count += occurrences.length
    amountCents += toMoneyCents(expense.value) * occurrences.length
  }

  return { amount: fromMoneyCents(amountCents), count }
}

function estimateFutureInstallments(expenses: ExpenseLineV4[], today: string): FutureInstallmentEstimate {
  let amountCents = 0
  let count = 0
  let nextDate: string | null = null

  for (const expense of expenses) {
    for (const date of installmentOccurrenceDates(expense)) {
      if (date <= today) continue
      count += 1
      amountCents += toMoneyCents(expense.value)
      if (nextDate === null || date < nextDate) nextDate = date
    }
  }

  return { amount: fromMoneyCents(amountCents), count, nextDate }
}

function buildCardView(card: AccountV2, expenses: ExpenseLineV4[], now: Date): CardBillingView {
  const invoiceCents = toMoneyCents(card.fatura)
  const limitCents = toMoneyCents(card.limite)
  const availableCents = Math.max(0, limitCents - invoiceCents)
  const today = toLocalIso(new Date(now.getFullYear(), now.getMonth(), now.getDate()))
  const closingWindow = resolveClosingWindow(card.fechamento, now)
  const afterClosing = closingWindow
    ? {
        ...estimateOccurrences(expenses, closingWindow.fromDate, closingWindow.toDate),
        fromDate: closingWindow.fromDate,
        toDate: closingWindow.toDate,
        closingDate: closingWindow.closingDate,
        uncertainOnClosingDay: estimateOccurrences(expenses, closingWindow.uncertainDate, closingWindow.uncertainDate),
      }
    : null

  return {
    cardId: card.id,
    informedInvoice: fromMoneyCents(invoiceCents),
    informedLimit: fromMoneyCents(limitCents),
    availableCredit: fromMoneyCents(availableCents),
    overLimit: fromMoneyCents(Math.max(0, invoiceCents - limitCents)),
    usagePercentage: limitCents > 0 ? Math.round((invoiceCents / limitCents) * 100) : null,
    afterClosing,
    futureInstallments: estimateFutureInstallments(expenses, today),
  }
}

export function buildCardBillingSummary(data: FinanceBootstrap, now = new Date()): CardBillingSummary {
  const cards = data.accounts_v2.filter((account) => account.tipo === "cartao").map((card) => {
    const expenses = data.expense_lines_v4.filter((expense) => expense.accountId === card.id)
    return buildCardView(card, expenses, now)
  })

  return {
    cards,
    totalInformedInvoice: fromMoneyCents(cards.reduce((sum, card) => sum + toMoneyCents(card.informedInvoice), 0)),
    totalInformedLimit: fromMoneyCents(cards.reduce((sum, card) => sum + toMoneyCents(card.informedLimit), 0)),
    totalAvailableCredit: fromMoneyCents(cards.reduce((sum, card) => sum + toMoneyCents(card.availableCredit), 0)),
    totalAfterClosingEstimate: fromMoneyCents(cards.reduce((sum, card) => sum + toMoneyCents(card.afterClosing?.amount ?? 0), 0)),
    totalFutureInstallments: fromMoneyCents(cards.reduce((sum, card) => sum + toMoneyCents(card.futureInstallments.amount), 0)),
  }
}
