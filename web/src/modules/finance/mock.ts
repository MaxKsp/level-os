/**
 * Mock ISOLADO do Financeiro para o preview.
 *
 * Espelha as chaves reais do contrato PHP (`accounts_v2`, `expense_lines_v4`,
 * `income_lines`, `ifood-entries`, `vaults`, `transfers`, ...). Trocar por
 * `GET api/data.php?all=1` no futuro é só substituir esta fonte — nenhum
 * componente conhece a origem dos dados.
 */
import type { FinanceBootstrap } from "./contracts"

export const financeBootstrapMock: FinanceBootstrap = {
  accounts_v2: [
    {
      id: "acc-principal",
      label: "Conta Corrente",
      tipo: "conta",
      saldo: 8420.55,
      chequeEspecial: 1000,
      limite: 0,
      fatura: 0,
      fechamento: null,
      vencimento: null,
      bank: "Nubank",
      principal: true,
      createdAt: 1710000000,
    },
    {
      id: "acc-poupanca",
      label: "Reserva",
      tipo: "poupanca",
      saldo: 4030.25,
      chequeEspecial: 0,
      limite: 0,
      fatura: 0,
      fechamento: null,
      vencimento: null,
      bank: "Nubank",
      principal: false,
      createdAt: 1710000000,
    },
    {
      id: "acc-cartao-inter",
      label: "Cartão Inter",
      tipo: "cartao",
      saldo: 0,
      chequeEspecial: 0,
      limite: 6000,
      fatura: 1580.45,
      fechamento: 22,
      vencimento: 1,
      bank: "Inter",
      principal: false,
      createdAt: 1710000000,
    },
    {
      id: "acc-cartao-c6",
      label: "Cartão C6",
      tipo: "cartao",
      saldo: 0,
      chequeEspecial: 0,
      limite: 4000,
      fatura: 540.0,
      fechamento: 15,
      vencimento: 25,
      bank: "C6",
      principal: false,
      createdAt: 1710000000,
    },
  ],
  expense_lines_v4: [
    {
      id: "exp-1",
      label: "Aluguel",
      value: 1800,
      date: "2026-07-05",
      time: null,
      recorrencia: "mensal",
      categoria: "moradia",
      method: "pix",
      bank: "Nubank",
      accountId: "acc-principal",
      parcelas: null,
      createdAt: 1719000000,
    },
    {
      id: "exp-2",
      label: "Supermercado",
      value: 640.3,
      date: "2026-07-12",
      time: "18:30",
      recorrencia: "none",
      categoria: "mercado",
      method: "credito",
      bank: "Inter",
      accountId: "acc-cartao-inter",
      parcelas: null,
      createdAt: 1720000000,
    },
    {
      id: "exp-3",
      label: "Academia",
      value: 129.9,
      date: "2026-07-08",
      time: null,
      recorrencia: "mensal",
      categoria: "saude",
      method: "credito",
      bank: "C6",
      accountId: "acc-cartao-c6",
      parcelas: null,
      createdAt: 1720100000,
    },
    {
      id: "exp-4",
      label: "Notebook (parcela)",
      value: 410.55,
      date: "2026-07-15",
      time: null,
      recorrencia: "mensal",
      categoria: "eletronicos",
      method: "credito",
      bank: "Inter",
      accountId: "acc-cartao-inter",
      parcelas: 6,
      createdAt: 1720200000,
    },
  ],
  income_lines: [
    {
      id: "inc-1",
      label: "Salário",
      value: 7200,
      type: "fixa",
      endDate: null,
      payday: 5,
      accountId: "acc-principal",
      createdAt: 1710000000,
    },
    {
      id: "inc-2",
      label: "Freelance",
      value: 1500,
      type: "variavel",
      endDate: null,
      payday: null,
      accountId: "acc-principal",
      createdAt: 1715000000,
    },
  ],
  "ifood-entries": [
    { date: "2026-07-10", valor: 92.5, km: 34 },
    { date: "2026-07-13", valor: 128.0, km: 47 },
  ],
  vaults: [
    { id: "vault-viagem", label: "Viagem", saldo: 2200, meta: 6000 },
    { id: "vault-emergencia", label: "Emergência", saldo: 3500, meta: 10000 },
  ],
  transfers: [
    {
      id: "tr-1",
      value: 500,
      date: "2026-07-01",
      from: "acc-principal",
      to: "vault-emergencia",
    },
  ],
  acc_view: "conta",
  bank_favorites: ["Nubank", "Inter"],
}

/**
 * Série de tendência do patrimônio líquido (últimos 6 meses).
 * UI-ONLY: não corresponde a nenhuma chave do backend; existe apenas para
 * ilustrar o gráfico da Visão Geral no preview.
 */
export const netWorthTrendMock: { month: string; value: number }[] = [
  { month: "Fev", value: 9800 },
  { month: "Mar", value: 10450 },
  { month: "Abr", value: 11200 },
  { month: "Mai", value: 10950 },
  { month: "Jun", value: 12100 },
  { month: "Jul", value: 12650 },
]
