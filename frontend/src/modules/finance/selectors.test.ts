import { describe, expect, it } from "vitest"
import type { FinanceBootstrap, IncomeLine } from "./contracts"
import {
  availableCredit,
  financeSummary,
  isIncomeActive,
  monthlyExpenses,
  monthlyIncome,
  netWorth,
  totalBalance,
  totalInvoice,
  totalVaults,
} from "./selectors"

const temporary = (endDate: string): IncomeLine => ({
  id: "temporary",
  label: "Seguro-desemprego",
  value: 1500,
  type: "temporaria",
  endDate,
  payday: 5,
  accountId: null,
  createdAt: null,
})

const bootstrap = (income: IncomeLine[]): FinanceBootstrap => ({
  accounts_v2: [],
  expense_lines_v4: [],
  income_lines: income,
  "ifood-entries": [],
  vaults: [],
  transfers: [],
  acc_view: "conta",
  bank_favorites: [],
})

describe("renda momentânea", () => {
  const today = new Date(2026, 6, 17)

  it("continua ativa até a data final, inclusive", () => {
    expect(isIncomeActive(temporary("2026-07-17"), today)).toBe(true)
    expect(monthlyIncome(bootstrap([temporary("2026-07-17")]), today)).toBe(1500)
  })

  it("sai da projeção depois da data final", () => {
    expect(isIncomeActive(temporary("2026-07-16"), today)).toBe(false)
    expect(monthlyIncome(bootstrap([temporary("2026-07-16")]), today)).toBe(0)
  })
})

describe("fórmulas financeiras canônicas", () => {
  const reference = new Date(2026, 6, 17)
  const data: FinanceBootstrap = {
    ...bootstrap([
      { ...temporary("2026-07-31"), id: "salary", type: "fixa", endDate: null, value: 5_000 },
    ]),
    accounts_v2: [
      { id: "checking", label: "Conta", tipo: "conta", saldo: 2_400, chequeEspecial: 1_000, limite: 0, fatura: 0, fechamento: null, vencimento: null, bank: null, principal: true, createdAt: null },
      { id: "savings", label: "Poupança", tipo: "poupanca", saldo: 600, chequeEspecial: 0, limite: 0, fatura: 0, fechamento: null, vencimento: null, bank: null, principal: false, createdAt: null },
      { id: "card", label: "Cartão", tipo: "cartao", saldo: 999, chequeEspecial: 0, limite: 4_000, fatura: 1_250, fechamento: 20, vencimento: 1, bank: null, principal: false, createdAt: null },
    ],
    expense_lines_v4: [
      { id: "july", label: "Mercado", value: 800, date: "2026-07-10", time: null, recorrencia: "none", categoria: "mercado", method: null, bank: null, accountId: "checking", parcelas: null, createdAt: null },
      { id: "june", label: "Anterior", value: 300, date: "2026-06-30", time: null, recorrencia: "none", categoria: "outros", method: null, bank: null, accountId: "checking", parcelas: null, createdAt: null },
    ],
    "ifood-entries": [
      { id: "july-income", date: "2026-07-12", valor: 200, km: null },
      { id: "june-income", date: "2026-06-30", valor: 900, km: null },
    ],
    vaults: [{ id: "reserve", label: "Reserva", saldo: 2_000, meta: 4_000 }],
  }

  it("separa saldo, fatura, crédito e reservas sem dupla contagem", () => {
    expect(totalBalance(data.accounts_v2)).toBe(3_000)
    expect(totalInvoice(data.accounts_v2)).toBe(1_250)
    expect(availableCredit(data.accounts_v2)).toBe(2_750)
    expect(totalVaults(data)).toBe(2_000)
    expect(netWorth(data)).toBe(3_750)
  })

  it("limita receitas e despesas variáveis ao mês de referência", () => {
    expect(monthlyIncome(data, reference)).toBe(5_200)
    expect(monthlyExpenses(data, reference)).toBe(800)
  })

  it("entrega os mesmos números para todas as telas consumidoras", () => {
    expect(financeSummary(data, reference)).toMatchObject({
      netWorth: 3_750,
      totalBalance: 3_000,
      totalInvoice: 1_250,
      availableCredit: 2_750,
      totalVaults: 2_000,
      monthlyIncome: 5_200,
      monthlyExpenses: 800,
      monthlyProjection: 4_400,
      accountsCount: 2,
      cardsCount: 1,
    })
  })
})
