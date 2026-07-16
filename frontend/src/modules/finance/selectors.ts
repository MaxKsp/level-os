/**
 * Seletores do Financeiro — funções puras que derivam valores de UI a partir
 * do contrato público. Não introduzem novas chaves de backend; apenas
 * agregam os dados que o bootstrap já expõe.
 */
import type { AccountV2, FinanceBootstrap } from "./contracts"

export function isCard(account: AccountV2): boolean {
  return account.tipo === "cartao"
}

/** Soma dos saldos das contas não-cartão (conta, poupança, ...). */
export function totalBalance(accounts: AccountV2[]): number {
  return accounts
    .filter((a) => !isCard(a))
    .reduce((sum, a) => sum + a.saldo, 0)
}

/** Soma das faturas em aberto dos cartões. */
export function totalInvoice(accounts: AccountV2[]): number {
  return accounts
    .filter(isCard)
    .reduce((sum, a) => sum + a.fatura, 0)
}

/** Crédito disponível = soma de (limite − fatura) dos cartões. */
export function availableCredit(accounts: AccountV2[]): number {
  return accounts
    .filter(isCard)
    .reduce((sum, a) => sum + Math.max(0, a.limite - a.fatura), 0)
}

/** Total guardado em cofrinhos. */
export function totalVaults(data: Pick<FinanceBootstrap, "vaults">): number {
  return data.vaults.reduce((sum, v) => sum + (v.saldo ?? 0), 0)
}

/**
 * Patrimônio líquido = saldos + cofrinhos − faturas em aberto.
 * Derivação de UI para o KPI principal da Visão Geral.
 */
export function netWorth(data: FinanceBootstrap): number {
  return (
    totalBalance(data.accounts_v2) +
    totalVaults(data) -
    totalInvoice(data.accounts_v2)
  )
}

export function monthlyIncome(data: FinanceBootstrap): number {
  return data.income_lines.reduce((sum, i) => sum + i.value, 0)
}

export function monthlyExpenses(data: FinanceBootstrap): number {
  return data.expense_lines_v4.reduce((sum, e) => sum + e.value, 0)
}

/** Projeção simples do mês: entradas − saídas previstas. */
export function monthlyProjection(data: FinanceBootstrap): number {
  return monthlyIncome(data) - monthlyExpenses(data)
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

export function financeSummary(data: FinanceBootstrap): FinanceSummary {
  return {
    netWorth: netWorth(data),
    totalBalance: totalBalance(data.accounts_v2),
    totalInvoice: totalInvoice(data.accounts_v2),
    availableCredit: availableCredit(data.accounts_v2),
    totalVaults: totalVaults(data),
    monthlyIncome: monthlyIncome(data),
    monthlyExpenses: monthlyExpenses(data),
    monthlyProjection: monthlyProjection(data),
    accountsCount: data.accounts_v2.filter((a) => !isCard(a)).length,
    cardsCount: data.accounts_v2.filter(isCard).length,
  }
}
