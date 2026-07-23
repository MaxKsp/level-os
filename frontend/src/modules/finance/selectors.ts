/**
 * Seletores do Financeiro — funções puras que derivam valores de UI a partir
 * do contrato público. Não introduzem novas chaves de backend; apenas
 * agregam os dados que o bootstrap já expõe.
 */
import type { AccountV2, FinanceBootstrap, IncomeLine } from "./contracts"
import { fromMoneyCents, sumMoney, toMoneyCents } from "../../lib/money"
import { isDateInRange, resolveFinancePeriod } from "./period"

export function isCard(account: AccountV2): boolean {
  return account.tipo === "cartao"
}

/** Soma dos saldos das contas não-cartão (conta, poupança, ...). */
export function totalBalance(accounts: AccountV2[]): number {
  return sumMoney(accounts.filter((a) => !isCard(a)).map((account) => account.saldo))
}

/** Soma das faturas em aberto dos cartões. */
export function totalInvoice(accounts: AccountV2[]): number {
  return sumMoney(accounts.filter(isCard).map((account) => account.fatura))
}

/** Crédito disponível = soma de (limite − fatura) dos cartões. */
export function availableCredit(accounts: AccountV2[]): number {
  const cents = accounts.filter(isCard).reduce(
    (sum, account) => sum + Math.max(0, toMoneyCents(account.limite) - toMoneyCents(account.fatura)),
    0,
  )
  return fromMoneyCents(cents)
}

/** Total guardado em cofrinhos. */
export function totalVaults(data: Pick<FinanceBootstrap, "vaults">): number {
  return sumMoney(data.vaults.map((vault) => vault.saldo ?? 0))
}

/**
 * Patrimônio líquido = saldos + cofrinhos − faturas em aberto.
 * Derivação de UI para o KPI principal da Visão Geral.
 */
export function netWorth(data: FinanceBootstrap): number {
  return sumMoney([totalBalance(data.accounts_v2), totalVaults(data), -totalInvoice(data.accounts_v2)])
}

export function isIncomeActive(income: IncomeLine, referenceDate = new Date()): boolean {
  if (income.type !== "temporaria" || !income.endDate) return true
  const year = referenceDate.getFullYear()
  const month = String(referenceDate.getMonth() + 1).padStart(2, "0")
  const day = String(referenceDate.getDate()).padStart(2, "0")
  return income.endDate >= `${year}-${month}-${day}`
}

export function monthlyIncome(data: FinanceBootstrap, referenceDate = new Date()): number {
  const range = resolveFinancePeriod("month", "", "", referenceDate)
  const recurring = sumMoney(data.income_lines.filter((income) => isIncomeActive(income, referenceDate)).map((income) => income.value))
  const variable = sumMoney(data["ifood-entries"].filter((entry) => isDateInRange(entry.date, range)).map((entry) => entry.valor))
  return sumMoney([recurring, variable])
}

export function monthlyExpenses(data: FinanceBootstrap, referenceDate = new Date()): number {
  const range = resolveFinancePeriod("month", "", "", referenceDate)
  return sumMoney(data.expense_lines_v4.filter((expense) => isDateInRange(expense.date, range)).map((expense) => expense.value))
}

/** Projeção simples do mês: entradas − saídas previstas. */
export function monthlyProjection(data: FinanceBootstrap, referenceDate = new Date()): number {
  return sumMoney([monthlyIncome(data, referenceDate), -monthlyExpenses(data, referenceDate)])
}

export interface FinanceSummary {
  netWorth: number
  totalBalance: number
  totalInvoice: number
  availableCredit: number
  totalVaults: number
  monthlyIncome: number
  monthlyExpenses: number
  monthlyProjection: number
  accountsCount: number
  cardsCount: number
}

/** Soma dos limites dos cartões. */
export function totalLimit(accounts: AccountV2[]): number {
  return sumMoney(accounts.filter(isCard).map((account) => account.limite))
}

/** Despesas agrupadas por categoria, ordenadas por total desc. */
export function expensesByCategory(data: FinanceBootstrap): { category: string; total: number }[] {
  const m = new Map<string, number>()
  for (const e of data.expense_lines_v4) {
    const c = e.categoria ?? "outros"
    m.set(c, (m.get(c) ?? 0) + toMoneyCents(e.value))
  }
  return [...m.entries()].map(([category, total]) => ({ category, total: fromMoneyCents(total) })).sort((a, b) => b.total - a.total)
}

export function financeSummary(data: FinanceBootstrap, referenceDate = new Date()): FinanceSummary {
  return {
    netWorth: netWorth(data),
    totalBalance: totalBalance(data.accounts_v2),
    totalInvoice: totalInvoice(data.accounts_v2),
    availableCredit: availableCredit(data.accounts_v2),
    totalVaults: totalVaults(data),
    monthlyIncome: monthlyIncome(data, referenceDate),
    monthlyExpenses: monthlyExpenses(data, referenceDate),
    monthlyProjection: monthlyProjection(data, referenceDate),
    accountsCount: data.accounts_v2.filter((a) => !isCard(a)).length,
    cardsCount: data.accounts_v2.filter(isCard).length,
  }
}
