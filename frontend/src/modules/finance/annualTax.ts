import type { ExpenseLineV4, FinanceBootstrap, IncomeLine } from "./contracts"
import { fromMoneyCents, toMoneyCents } from "../../lib/money"
import { incomeEndIso, incomeStartIso } from "./incomeValidity"

export interface AnnualTaxMonth {
  label: string
  income: number
  expenses: number
  balance: number
}

export interface AnnualTaxData {
  year: number
  months: AnnualTaxMonth[]
  annualIncome: number
  annualExpenses: number
  annualBalance: number
  incomeByType: {
    fixed: number
    registeredVariable: number
    temporary: number
    actualVariable: number
  }
  expensesByCategory: { category: string; total: number }[]
}

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

function parseDate(value: string | null): Date | null {
  if (!value) return null
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function monthIndex(date: Date): number {
  return date.getFullYear() * 12 + date.getMonth()
}

function expenseOccurrencesInMonth(expense: ExpenseLineV4, year: number, month: number): number {
  const anchor = parseDate(expense.date)
  if (!anchor) return 0
  const offset = year * 12 + month - monthIndex(anchor)

  if ((expense.parcelas ?? 0) >= 2) {
    return offset >= 0 && offset < Number(expense.parcelas) ? 1 : 0
  }
  if (expense.recorrencia === "mensal") return offset >= 0 ? 1 : 0
  return anchor.getFullYear() === year && anchor.getMonth() === month ? 1 : 0
}

function incomeIsActiveInMonth(income: IncomeLine, year: number, month: number): boolean {
  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)
  // Início da vigência: data explícita (usada por versões de salário) ou, na
  // ausência, a data de criação. Respeitar o fim vale para todos os tipos —
  // é o que permite versionar a renda fixa sem reescrever o histórico: cada
  // faixa é uma linha com seu próprio valor, início e fim.
  const start = parseDate(incomeStartIso(income))
  if (start && start > monthEnd) return false
  const endDate = parseDate(incomeEndIso(income))
  return !endDate || endDate >= monthStart
}

/** Porta para TypeScript do relatório anual que já existia no frontend legado. */
export function buildAnnualTaxData(year: number, data: FinanceBootstrap): AnnualTaxData {
  const categoryTotals = new Map<string, number>()
  const incomeByTypeCents = { fixed: 0, registeredVariable: 0, temporary: 0, actualVariable: 0 }
  let annualIncomeCents = 0
  let annualExpensesCents = 0

  const months = MONTHS.map((label, month) => {
    let expensesCents = 0
    for (const expense of data.expense_lines_v4) {
      const totalCents = expenseOccurrencesInMonth(expense, year, month) * toMoneyCents(Number(expense.value || 0))
      if (totalCents <= 0) continue
      expensesCents += totalCents
      const category = expense.categoria || "outros"
      categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + totalCents)
    }

    let incomeCents = 0
    for (const line of data.income_lines) {
      if (!incomeIsActiveInMonth(line, year, month)) continue
      const valueCents = toMoneyCents(Number(line.value || 0))
      incomeCents += valueCents
      if (line.type === "temporaria") incomeByTypeCents.temporary += valueCents
      else if (line.type === "variavel") incomeByTypeCents.registeredVariable += valueCents
      else incomeByTypeCents.fixed += valueCents
    }

    const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`
    const actualVariableCents = data["ifood-entries"]
      .filter((entry) => entry.date?.slice(0, 7) === monthKey)
      .reduce((sum, entry) => sum + toMoneyCents(Number(entry.valor || 0)), 0)
    incomeCents += actualVariableCents
    incomeByTypeCents.actualVariable += actualVariableCents
    annualIncomeCents += incomeCents
    annualExpensesCents += expensesCents

    return { label, income: fromMoneyCents(incomeCents), expenses: fromMoneyCents(expensesCents), balance: fromMoneyCents(incomeCents - expensesCents) }
  })

  return {
    year,
    months,
    annualIncome: fromMoneyCents(annualIncomeCents),
    annualExpenses: fromMoneyCents(annualExpensesCents),
    annualBalance: fromMoneyCents(annualIncomeCents - annualExpensesCents),
    incomeByType: {
      fixed: fromMoneyCents(incomeByTypeCents.fixed),
      registeredVariable: fromMoneyCents(incomeByTypeCents.registeredVariable),
      temporary: fromMoneyCents(incomeByTypeCents.temporary),
      actualVariable: fromMoneyCents(incomeByTypeCents.actualVariable),
    },
    expensesByCategory: [...categoryTotals.entries()]
      .map(([category, total]) => ({ category, total: fromMoneyCents(total) }))
      .sort((a, b) => b.total - a.total),
  }
}
