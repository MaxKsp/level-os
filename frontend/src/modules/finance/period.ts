import type { FinanceBootstrap, IncomeLine } from "./contracts"
import { fromMoneyCents, sumMoney, toMoneyCents } from "../../lib/money"
import { expenseOccurrencesInRange } from "./installments"

export type FinancePeriodPreset = "7d" | "30d" | "90d" | "month" | "previous-month" | "3m" | "6m" | "12m" | "custom"

export interface FinanceDateRange {
  start: string
  end: string
  label: string
}

export interface FinancePeriodTotals {
  income: number
  recurringIncome: number
  variableIncome: number
  recurringIncomeOccurrences: number
  variableIncomeOccurrences: number
  expenses: number
  balance: number
  filteredExpenses: FinanceBootstrap["expense_lines_v4"]
}

export interface FinanceTrendPoint {
  date: string
  label: string
  value: number
}

const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })

export function toLocalIso(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")
}

function fromIso(value: string): Date {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function shiftDays(date: Date, amount: number): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  copy.setDate(copy.getDate() + amount)
  return copy
}

function rangeLabel(start: string, end: string): string {
  return `${shortDate.format(fromIso(start))} – ${shortDate.format(fromIso(end))}`
}

export function resolveFinancePeriod(
  preset: FinancePeriodPreset,
  customStart: string,
  customEnd: string,
  now = new Date(),
): FinanceDateRange {
  let start: Date
  let end = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (preset === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1)
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  } else if (preset === "previous-month") {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    end = new Date(now.getFullYear(), now.getMonth(), 0)
  } else if (preset === "3m" || preset === "6m" || preset === "12m") {
    const months = preset === "12m" ? 12 : preset === "6m" ? 6 : 3
    start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)
  } else if (preset === "custom" && customStart && customEnd) {
    const first = customStart <= customEnd ? customStart : customEnd
    const last = customStart <= customEnd ? customEnd : customStart
    return { start: first, end: last, label: rangeLabel(first, last) }
  } else {
    const days = preset === "90d" ? 90 : preset === "30d" ? 30 : 7
    start = shiftDays(end, -(days - 1))
  }

  const startIso = toLocalIso(start)
  const endIso = toLocalIso(end)
  return { start: startIso, end: endIso, label: rangeLabel(startIso, endIso) }
}

export function isDateInRange(date: string | null, range: FinanceDateRange): boolean {
  return Boolean(date && date >= range.start && date <= range.end)
}

function incomeOccurrenceDates(income: IncomeLine, range: FinanceDateRange): string[] {
  if (income.endDate && income.endDate < range.start) return []

  const first = fromIso(range.start)
  const last = fromIso(income.endDate && income.endDate < range.end ? income.endDate : range.end)
  const occurrences: string[] = []

  for (
    let cursor = new Date(first.getFullYear(), first.getMonth(), 1);
    cursor <= last;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  ) {
    const lastDay = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
    const day = income.payday ? Math.min(income.payday, lastDay) : 1
    const occurrence = toLocalIso(new Date(cursor.getFullYear(), cursor.getMonth(), day))
    if (occurrence >= range.start && occurrence <= range.end && (!income.endDate || occurrence <= income.endDate)) {
      occurrences.push(occurrence)
    }
  }

  return occurrences
}

function incomeOccurrences(income: IncomeLine, range: FinanceDateRange): number {
  return incomeOccurrenceDates(income, range).length
}

export function financeTotalsForPeriod(data: FinanceBootstrap, range: FinanceDateRange): FinancePeriodTotals {
  const filteredExpenses = data.expense_lines_v4.flatMap((expense) =>
    expenseOccurrencesInRange(expense, range.start, range.end).map((date) => ({ ...expense, date })),
  )
  const expenses = sumMoney(filteredExpenses.map((expense) => expense.value))
  const recurringIncomeOccurrences = data.income_lines.reduce(
    (sum, income) => sum + incomeOccurrences(income, range),
    0,
  )
  const recurringIncome = fromMoneyCents(data.income_lines.reduce(
    (sum, income) => sum + toMoneyCents(income.value) * incomeOccurrences(income, range),
    0,
  ))
  const variableEntries = data["ifood-entries"].filter((entry) => isDateInRange(entry.date, range))
  const variableIncome = sumMoney(variableEntries.map((entry) => entry.valor))
  const income = sumMoney([recurringIncome, variableIncome])

  return {
    income,
    recurringIncome,
    variableIncome,
    recurringIncomeOccurrences,
    variableIncomeOccurrences: variableEntries.length,
    expenses,
    balance: sumMoney([income, -expenses]),
    filteredExpenses,
  }
}

/**
 * Reconstrói uma curva coerente com o intervalo escolhido usando apenas os
 * movimentos que o backend realmente expõe. O saldo atual é a âncora final;
 * portanto a curva é uma perspectiva de fluxo, não um extrato de snapshots.
 */
export function financeTrendForPeriod(
  data: FinanceBootstrap,
  range: FinanceDateRange,
  endingNetWorth: number,
): FinanceTrendPoint[] {
  const totals = financeTotalsForPeriod(data, range)
  const movements = [
    ...data.expense_lines_v4.flatMap((expense) =>
      expenseOccurrencesInRange(expense, range.start, range.end)
        .map((date) => ({ date, valueCents: -toMoneyCents(expense.value) })),
    ),
    ...data["ifood-entries"]
      .filter((entry) => isDateInRange(entry.date, range))
      .map((entry) => ({ date: entry.date!, valueCents: toMoneyCents(entry.valor) })),
    ...data.income_lines.flatMap((income) =>
      incomeOccurrenceDates(income, range).map((date) => ({ date, valueCents: toMoneyCents(income.value) })),
    ),
  ].sort((a, b) => a.date.localeCompare(b.date))

  const first = fromIso(range.start)
  const last = fromIso(range.end)
  const spanDays = Math.max(0, Math.round((last.getTime() - first.getTime()) / 86_400_000))
  const pointCount = Math.min(7, spanDays + 1)
  const sampleDates = pointCount <= 1
    ? [range.start, range.end]
    : Array.from({ length: pointCount }, (_, index) =>
        toLocalIso(shiftDays(first, Math.round((spanDays * index) / (pointCount - 1)))),
      )
  const trendDate = new Intl.DateTimeFormat("pt-BR", {
    day: spanDays <= 90 ? "2-digit" : undefined,
    month: "short",
    year: spanDays > 365 ? "2-digit" : undefined,
  })
  const initialValueCents = toMoneyCents(endingNetWorth) - toMoneyCents(totals.balance)

  return sampleDates.map((date, index) => {
    const cumulativeCents = index === 0
      ? 0
      : movements.filter((movement) => movement.date <= date).reduce((sum, movement) => sum + movement.valueCents, 0)
    return {
      date,
      label: index === 0 ? "Início" : trendDate.format(fromIso(date)).replace(".", ""),
      value: fromMoneyCents(initialValueCents + cumulativeCents),
    }
  })
}
