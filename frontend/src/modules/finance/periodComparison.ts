import { fromMoneyCents, toMoneyCents } from "../../lib/money"
import { CATEGORY_LABEL } from "./categories"
import type { FinanceBootstrap } from "./contracts"
import { financeTotalsForPeriod, toLocalIso, type FinanceDateRange } from "./period"

/**
 * Comparação de período justa: o intervalo anterior sempre tem duração
 * equivalente ao atual. Nunca comparamos "1 a 18 de agosto" com um julho
 * inteiro. O recorte usado é declarado para que a leitura seja auditável.
 */
export type ComparisonMode = "partial-equivalent" | "closed" | "rolling-window"

export type DeltaDirection = "increased" | "decreased" | "stable" | "new" | "ended"

export interface DeltaResult {
  current: number
  previous: number
  absolute: number
  percentage: number | null
  direction: DeltaDirection
}

export interface CategoryDelta extends DeltaResult {
  category: string
  label: string
}

export interface PeriodComparison {
  mode: ComparisonMode
  modeLabel: string
  comparisonLabel: string
  current: FinanceDateRange
  previous: FinanceDateRange
  expenses: DeltaResult
  income: DeltaResult
  balance: DeltaResult
  categories: CategoryDelta[]
}

const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })

const MODE_LABEL: Record<ComparisonMode, string> = {
  "partial-equivalent": "Parcial equivalente",
  closed: "Período fechado",
  "rolling-window": "Janela móvel",
}

function fromIso(value: string): Date {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function shiftDays(value: Date, amount: number): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate() + amount)
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function dayCount(range: FinanceDateRange): number {
  const start = fromIso(range.start)
  const end = fromIso(range.end)
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
}

function formatRange(start: string, end: string): string {
  return `${shortDate.format(fromIso(start)).replace(".", "")} – ${shortDate.format(fromIso(end)).replace(".", "")}`
}

function labelled(start: string, end: string): FinanceDateRange {
  return { start, end, label: formatRange(start, end) }
}

/**
 * Escolhe o recorte anterior comparável:
 * - mês completo → mês anterior completo;
 * - mês em andamento a partir do dia 1 → mesmos dias do mês anterior;
 * - qualquer outro intervalo → janela imediatamente anterior de igual duração.
 */
export function resolvePreviousRange(range: FinanceDateRange): { mode: ComparisonMode; previous: FinanceDateRange } {
  const start = fromIso(range.start)
  const end = fromIso(range.end)
  const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()
  const startsOnFirstDay = start.getDate() === 1

  if (sameMonth && startsOnFirstDay) {
    const previousMonth = new Date(start.getFullYear(), start.getMonth() - 1, 1)
    const previousLastDay = lastDayOfMonth(previousMonth.getFullYear(), previousMonth.getMonth())
    const isFullMonth = end.getDate() === lastDayOfMonth(start.getFullYear(), start.getMonth())
    const endDay = isFullMonth ? previousLastDay : Math.min(end.getDate(), previousLastDay)

    return {
      mode: isFullMonth ? "closed" : "partial-equivalent",
      previous: labelled(
        toLocalIso(previousMonth),
        toLocalIso(new Date(previousMonth.getFullYear(), previousMonth.getMonth(), endDay)),
      ),
    }
  }

  const length = dayCount(range)
  const previousEnd = shiftDays(start, -1)
  const previousStart = shiftDays(previousEnd, -(length - 1))
  return { mode: "rolling-window", previous: labelled(toLocalIso(previousStart), toLocalIso(previousEnd)) }
}

/** Delta em centavos inteiros; base zero nunca produz percentual infinito. */
export function computeDelta(current: number, previous: number): DeltaResult {
  const currentCents = toMoneyCents(current)
  const previousCents = toMoneyCents(previous)
  const absoluteCents = currentCents - previousCents

  let direction: DeltaDirection
  if (previousCents === 0 && currentCents === 0) direction = "stable"
  else if (previousCents === 0) direction = "new"
  else if (currentCents === 0) direction = "ended"
  else if (absoluteCents === 0) direction = "stable"
  else direction = absoluteCents > 0 ? "increased" : "decreased"

  return {
    current: fromMoneyCents(currentCents),
    previous: fromMoneyCents(previousCents),
    absolute: fromMoneyCents(absoluteCents),
    percentage: previousCents > 0 ? (absoluteCents / previousCents) * 100 : null,
    direction,
  }
}

function categoryTotals(data: FinanceBootstrap, range: FinanceDateRange): Map<string, number> {
  const totals = new Map<string, number>()
  for (const expense of financeTotalsForPeriod(data, range).filteredExpenses) {
    const key = expense.categoria?.trim() || "outros"
    totals.set(key, (totals.get(key) ?? 0) + toMoneyCents(expense.value))
  }
  return totals
}

export function buildPeriodComparison(data: FinanceBootstrap, range: FinanceDateRange): PeriodComparison {
  const { mode, previous } = resolvePreviousRange(range)
  const currentTotals = financeTotalsForPeriod(data, range)
  const previousTotals = financeTotalsForPeriod(data, previous)
  const currentCategories = categoryTotals(data, range)
  const previousCategories = categoryTotals(data, previous)

  const categories = [...new Set([...currentCategories.keys(), ...previousCategories.keys()])]
    .map((category) => ({
      category,
      label: CATEGORY_LABEL[category] ?? category,
      ...computeDelta(
        fromMoneyCents(currentCategories.get(category) ?? 0),
        fromMoneyCents(previousCategories.get(category) ?? 0),
      ),
    }))
    .sort((left, right) => Math.abs(right.absolute) - Math.abs(left.absolute))

  return {
    mode,
    modeLabel: MODE_LABEL[mode],
    comparisonLabel: `${range.label} vs. ${previous.label}`,
    current: range,
    previous,
    expenses: computeDelta(currentTotals.expenses, previousTotals.expenses),
    income: computeDelta(currentTotals.income, previousTotals.income),
    balance: computeDelta(currentTotals.balance, previousTotals.balance),
    categories,
  }
}

/**
 * Em despesa, subir é alerta e cair é melhoria — o oposto da renda. A cor
 * nunca deriva apenas do sinal do número.
 */
export function expenseTone(direction: DeltaDirection): "warning" | "positive" | "neutral" {
  if (direction === "increased" || direction === "new") return "warning"
  if (direction === "decreased" || direction === "ended") return "positive"
  return "neutral"
}

export function incomeTone(direction: DeltaDirection): "warning" | "positive" | "neutral" {
  if (direction === "increased" || direction === "new") return "positive"
  if (direction === "decreased" || direction === "ended") return "warning"
  return "neutral"
}

export function formatDeltaPercentage(delta: DeltaResult): string {
  if (delta.direction === "new") return "novo"
  if (delta.direction === "stable") return "sem variação"
  if (delta.percentage === null) return "sem base anterior"
  const rounded = Math.round(delta.percentage)
  return `${rounded > 0 ? "+" : ""}${rounded}%`
}
