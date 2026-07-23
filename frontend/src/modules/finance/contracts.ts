/**
 * Contratos públicos do Financeiro — ESPELHO do backend PHP.
 *
 * Fonte de verdade: `docs/architecture/finance/FINANCE_PUBLIC_CONTRACTS.md`
 * e a resposta de `GET api/data.php?all=1`.
 *
 * NÃO altere nomes de chaves nem de campos: estes tipos existem para que a
 * troca dos mocks pela API real seja feita sem atrito. Os nomes em português
 * (saldo, fatura, chequeEspecial, etc.) refletem o shape observado no PHP.
 */

import type { SalaryInput } from "./salary"

/** Chave pública `accounts_v2` (relacional). */
export interface AccountV2 {
  id: string
  label: string
  tipo: "conta" | "poupanca" | "cartao" | string
  saldo: number
  chequeEspecial: number
  limite: number
  fatura: number
  fechamento: number | null
  vencimento: number | null
  bank: string | null
  principal: boolean
  createdAt: number | null
}

/** Chave pública `expense_lines_v4` (relacional). */
export interface ExpenseLineV4 {
  id: string
  label: string
  value: number
  date: string | null
  time: string | null
  recorrencia: "none" | "mensal" | null
  categoria: string | null
  method: string | null
  bank: string | null
  accountId: string | null
  parcelas: number | null
  createdAt: number | null
}

/** Chave pública `income_lines` (relacional). */
export interface IncomeLine {
  id: string
  label: string
  value: number
  type: "fixa" | "variavel" | "temporaria" | "momentanea" | "avulso" | null
  date?: string | null
  endDate: string | null
  payday: number | null
  accountId: string | null
  createdAt: number | null
  /** Parâmetros da estimativa CLT, persistidos para permitir reedição. */
  salaryDetails?: SalaryInput | null
}

/** Chave pública `ifood-entries` (relacional). */
export interface IfoodEntry {
  id?: string
  date: string | null
  valor: number
  km: number | null
  /** Metadados opcionais usados pelo preview/localStorage; o backend legado ignora extras. */
  label?: string | null
  accountId?: string | null
  source?: "manual" | "ofx" | string
}

/** Chave auxiliar `vaults` (kv). Shape de alto nível. */
export interface Vault {
  id: string
  label: string
  saldo: number
  meta?: number | null
  [extra: string]: unknown
}

/** Chave auxiliar `transfers` (kv). Shape de alto nível. */
export interface Transfer {
  id: string
  value: number
  date: string | null
  from?: string | null
  to?: string | null
  [extra: string]: unknown
}

/**
 * Recorte financeiro do bootstrap combinado devolvido por
 * `GET api/data.php?all=1`. Mantém as chaves públicas exatamente como o
 * backend as expõe (incluindo `ifood-entries` e `accounts_v2`).
 */
export interface FinanceBootstrap {
  accounts_v2: AccountV2[]
  expense_lines_v4: ExpenseLineV4[]
  income_lines: IncomeLine[]
  "ifood-entries": IfoodEntry[]
  vaults: Vault[]
  transfers: Transfer[]
  acc_view: "conta" | "banco"
  bank_favorites: string[]
}
