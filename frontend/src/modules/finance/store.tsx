import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { hasFinanceBackend, loadFinanceBootstrap, saveFinanceAuxiliary, saveFinanceSet, type FinanceAuxKey, type FinanceSetKey } from "./api"
import type { AccountV2, ExpenseLineV4, FinanceBootstrap, IfoodEntry, IncomeLine, Transfer } from "./contracts"
import type { SalaryInput } from "./salary"
import { financeBootstrapMock } from "./mock"
import { useProgress } from "../progress/store"
import { addMoney, subtractMoney } from "../../lib/money"
import { userStorageKey } from "../../lib/userStorage"
import { incomeStartIso } from "./incomeValidity"

const STORAGE_KEY = "level-os:finance:v1"

const EMPTY_FINANCE: FinanceBootstrap = {
  accounts_v2: [],
  income_lines: [],
  expense_lines_v4: [],
  "ifood-entries": [],
  vaults: [],
  transfers: [],
  acc_view: "conta",
  bank_favorites: [],
}

export function genId(prefix = "acc"): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

function normalizedBank(value: string): string {
  return value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "")
}

export function toggleFavoriteBank(current: string[], bank: string): string[] {
  const clean = bank.trim()
  if (!clean) return current
  const normalized = normalizedBank(clean)
  const exists = current.some((item) => normalizedBank(item) === normalized)
  if (exists) return current.filter((item) => normalizedBank(item) !== normalized)
  return current.length >= 5 ? current : [...current, clean]
}

interface FinanceState {
  accounts: AccountV2[]
  income: IncomeLine[]
  expenses: ExpenseLineV4[]
  variableIncome: IfoodEntry[]
  vaults: FinanceBootstrap["vaults"]
  transfers: FinanceBootstrap["transfers"]
  accountView: FinanceBootstrap["acc_view"]
  bankFavorites: FinanceBootstrap["bank_favorites"]
}

export type FinanceSyncStatus = "local" | "loading" | "syncing" | "synced" | "error"

interface FinanceContextValue extends FinanceState {
  bootstrap: FinanceBootstrap
  syncStatus: FinanceSyncStatus
  syncError: string | null
  refresh: () => Promise<void>
  addAccount: (account: AccountV2) => void
  updateAccount: (account: AccountV2) => void
  removeAccount: (id: string) => void
  setPrincipal: (id: string) => void
  addIncome: (income: IncomeLine) => void
  updateIncome: (income: IncomeLine) => void
  /** Encerra a faixa atual e abre uma nova a partir de `effectiveMonth` (YYYY-MM), preservando o histórico. */
  versionIncome: (id: string, value: number, effectiveMonth: string, salaryDetails?: SalaryInput | null) => void
  removeIncome: (id: string) => void
  addExpense: (expense: ExpenseLineV4) => void
  addExpenses: (expenses: ExpenseLineV4[]) => void
  addVariableIncome: (income: IfoodEntry) => void
  addVariableIncomes: (income: IfoodEntry[]) => void
  removeVariableIncome: (id: string) => void
  toggleBankFavorite: (bank: string) => void
  addTransfer: (transfer: Transfer) => void
}

const FinanceContext = createContext<FinanceContextValue | undefined>(undefined)

function fromBootstrap(data: FinanceBootstrap): FinanceState {
  return {
    accounts: data.accounts_v2,
    income: data.income_lines,
    expenses: data.expense_lines_v4,
    variableIncome: data["ifood-entries"],
    vaults: data.vaults,
    transfers: data.transfers,
    accountView: data.acc_view,
    bankFavorites: data.bank_favorites,
  }
}

function loadLocal(): FinanceState {
  try {
    const raw = localStorage.getItem(userStorageKey(STORAGE_KEY))
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<FinanceState> & { version?: number }
      const currentCache = parsed.version === 3
      if (Array.isArray(parsed.accounts) && Array.isArray(parsed.income)) {
        return {
          accounts: parsed.accounts,
          income: parsed.income,
          expenses: Array.isArray(parsed.expenses) ? parsed.expenses : financeBootstrapMock.expense_lines_v4,
          variableIncome: Array.isArray(parsed.variableIncome) ? parsed.variableIncome : financeBootstrapMock["ifood-entries"],
          vaults: currentCache && Array.isArray(parsed.vaults) ? parsed.vaults : financeBootstrapMock.vaults,
          transfers: currentCache && Array.isArray(parsed.transfers) ? parsed.transfers : financeBootstrapMock.transfers,
          accountView: parsed.accountView === "banco" ? "banco" : "conta",
          bankFavorites: currentCache && Array.isArray(parsed.bankFavorites) ? parsed.bankFavorites : financeBootstrapMock.bank_favorites,
        }
      }
    }
  } catch {
    // Cache inválido não impede a abertura do aplicativo.
  }
  return fromBootstrap(financeBootstrapMock)
}

function setSnapshots(state: FinanceState): Record<FinanceSetKey, string> {
  return {
    accounts_v2: JSON.stringify(state.accounts),
    income_lines: JSON.stringify(state.income),
    expense_lines_v4: JSON.stringify(state.expenses),
    "ifood-entries": JSON.stringify(state.variableIncome),
  }
}

function auxiliarySnapshots(state: FinanceState): Record<FinanceAuxKey, string> {
  return {
    bank_favorites: JSON.stringify(state.bankFavorites),
    transfers: JSON.stringify(state.transfers),
  }
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { refresh: refreshProgress } = useProgress()
  const remote = hasFinanceBackend()
  // Produção começa vazia/skeleton e aguarda a API; mocks ficam só no preview local.
  const [state, setState] = useState<FinanceState>(() => remote ? fromBootstrap(EMPTY_FINANCE) : loadLocal())
  const [syncStatus, setSyncStatus] = useState<FinanceSyncStatus>(remote ? "loading" : "local")
  const [syncError, setSyncError] = useState<string | null>(null)
  const [remoteReady, setRemoteReady] = useState(false)
  const persistedSets = useRef<Record<FinanceSetKey, string>>({ accounts_v2: "", income_lines: "", expense_lines_v4: "", "ifood-entries": "" })
  const persistedAuxiliary = useRef<Record<FinanceAuxKey, string>>({ bank_favorites: "", transfers: "" })
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve())
  const auxiliaryQueue = useRef<Promise<unknown>>(Promise.resolve())
  const revision = useRef(0)

  useEffect(() => {
    const key = userStorageKey(STORAGE_KEY)
    if (remote) {
      localStorage.removeItem(key)
      return
    }
    localStorage.setItem(key, JSON.stringify({ version: 3, ...state }))
  }, [remote, state])

  const refresh = useCallback(async () => {
    if (!remote) return
    try {
      const next = fromBootstrap(await loadFinanceBootstrap())
      persistedSets.current = setSnapshots(next)
      persistedAuxiliary.current = auxiliarySnapshots(next)
      setState(next)
      setRemoteReady(true)
      setSyncStatus("synced")
      setSyncError(null)
    } catch (cause) {
      setRemoteReady(false)
      setSyncStatus("error")
      setSyncError(cause instanceof Error ? cause.message : "Não foi possível carregar os dados financeiros.")
      throw cause
    }
  }, [remote])

  useEffect(() => { void refresh().catch(() => undefined) }, [refresh])

  useEffect(() => {
    if (!remoteReady) return
    const values: Record<FinanceSetKey, unknown[]> = {
      accounts_v2: state.accounts,
      income_lines: state.income,
      expense_lines_v4: state.expenses,
      "ifood-entries": state.variableIncome,
    }
    const snapshots = setSnapshots(state)
    const changed = (Object.keys(values) as FinanceSetKey[]).filter((key) => snapshots[key] !== persistedSets.current[key])
    if (!changed.length) return
    const currentRevision = ++revision.current
    setSyncStatus("syncing")
    const timer = window.setTimeout(() => {
      saveQueue.current = saveQueue.current
        .catch(() => undefined)
        .then(() => Promise.all(changed.map((key) => saveFinanceSet(key, values[key]))))
        .then(() => {
          changed.forEach((key) => { persistedSets.current[key] = snapshots[key] })
          if (changed.some((key) => key !== "accounts_v2")) void refreshProgress()
          if (revision.current === currentRevision) {
            setSyncStatus("synced")
            setSyncError(null)
          }
        })
        .catch((cause) => {
          if (revision.current === currentRevision) {
            setSyncStatus("error")
            setSyncError(cause instanceof Error ? cause.message : "Não foi possível salvar as alterações.")
          }
        })
    }, 500)
    return () => window.clearTimeout(timer)
  }, [remoteReady, refreshProgress, state.accounts, state.income, state.expenses, state.variableIncome])

  useEffect(() => {
    if (!remoteReady) return
    const values: Record<FinanceAuxKey, unknown> = { bank_favorites: state.bankFavorites, transfers: state.transfers }
    const snapshots = auxiliarySnapshots(state)
    const changed = (Object.keys(values) as FinanceAuxKey[]).filter((key) => snapshots[key] !== persistedAuxiliary.current[key])
    if (!changed.length) return
    setSyncStatus("syncing")
    const timer = window.setTimeout(() => {
      auxiliaryQueue.current = auxiliaryQueue.current
        .catch(() => undefined)
        .then(() => Promise.all(changed.map((key) => saveFinanceAuxiliary(key, values[key]))))
        .then(() => {
          changed.forEach((key) => { persistedAuxiliary.current[key] = snapshots[key] })
          setSyncStatus("synced")
          setSyncError(null)
        })
        .catch((cause) => {
          setSyncStatus("error")
          setSyncError(cause instanceof Error ? cause.message : "Não foi possível salvar os dados auxiliares.")
        })
    }, 350)
    return () => window.clearTimeout(timer)
  }, [remoteReady, state.bankFavorites, state.transfers])

  const bootstrap: FinanceBootstrap = {
    accounts_v2: state.accounts,
    income_lines: state.income,
    expense_lines_v4: state.expenses,
    "ifood-entries": state.variableIncome,
    vaults: state.vaults,
    transfers: state.transfers,
    acc_view: state.accountView,
    bank_favorites: state.bankFavorites,
  }

  const value: FinanceContextValue = {
    ...state,
    bootstrap,
    syncStatus,
    syncError,
    refresh,
    addAccount: (account) => setState((current) => ({ ...current, accounts: [...current.accounts, account] })),
    updateAccount: (account) => setState((current) => ({ ...current, accounts: current.accounts.map((item) => item.id === account.id ? account : item) })),
    removeAccount: (id) => setState((current) => ({ ...current, accounts: current.accounts.filter((item) => item.id !== id) })),
    setPrincipal: (id) => setState((current) => ({ ...current, accounts: current.accounts.map((account) => ({ ...account, principal: account.id === id })) })),
    addIncome: (income) => setState((current) => ({ ...current, income: [...current.income, income] })),
    updateIncome: (income) => setState((current) => ({ ...current, income: current.income.map((item) => item.id === income.id ? income : item) })),
    versionIncome: (id, value, effectiveMonth, salaryDetails) => setState((current) => {
      const old = current.income.find((item) => item.id === id)
      if (
        !old
        || old.type !== "fixa"
        || old.endDate
        || !Number.isFinite(value)
        || value <= 0
        || !/^\d{4}-(0[1-9]|1[0-2])$/.test(effectiveMonth)
      ) return current
      const oldStartMonth = incomeStartIso(old)?.slice(0, 7)
      if (oldStartMonth && effectiveMonth <= oldStartMonth) return current
      const [year, month] = effectiveMonth.split("-").map(Number)
      const priorEnd = new Date(year, month - 1, 0) // último dia do mês anterior à vigência
      const pad = (n: number) => String(n).padStart(2, "0")
      const priorEndIso = `${priorEnd.getFullYear()}-${pad(priorEnd.getMonth() + 1)}-${pad(priorEnd.getDate())}`
      const closed: IncomeLine = { ...old, endDate: priorEndIso }
      const next: IncomeLine = {
        ...old,
        id: genId("inc"),
        value,
        date: `${effectiveMonth}-01`,
        endDate: null,
        salaryDetails: salaryDetails ?? old.salaryDetails ?? null,
        createdAt: Math.floor(Date.now() / 1000),
      }
      return { ...current, income: current.income.map((item) => item.id === id ? closed : item).concat(next) }
    }),
    removeIncome: (id) => setState((current) => ({ ...current, income: current.income.filter((item) => item.id !== id) })),
    addExpense: (expense) => setState((current) => ({ ...current, expenses: [...current.expenses, expense], accounts: applyExpenseToAccount(current.accounts, expense) })),
    addExpenses: (expenses) => setState((current) => ({ ...current, expenses: [...current.expenses, ...expenses], accounts: expenses.reduce(applyExpenseToAccount, current.accounts) })),
    addVariableIncome: (income) => setState((current) => ({ ...current, variableIncome: [...current.variableIncome, income] })),
    addVariableIncomes: (income) => setState((current) => ({ ...current, variableIncome: [...current.variableIncome, ...income] })),
    removeVariableIncome: (id) => setState((current) => ({ ...current, variableIncome: current.variableIncome.filter((entry, index) => (entry.id ?? `variable-${index}`) !== id) })),
    toggleBankFavorite: (bank) => setState((current) => ({ ...current, bankFavorites: toggleFavoriteBank(current.bankFavorites, bank) })),
    addTransfer: (transfer) => setState((current) => ({ ...current, transfers: [...current.transfers, transfer], accounts: applyTransferToAccounts(current.accounts, transfer) })),
  }

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

function applyExpenseToAccount(accounts: AccountV2[], expense: ExpenseLineV4): AccountV2[] {
  if (!expense.accountId) return accounts
  return accounts.map((account) => {
    if (account.id !== expense.accountId) return account
    return account.tipo === "cartao"
      ? { ...account, fatura: addMoney(account.fatura, expense.value) }
      : { ...account, saldo: subtractMoney(account.saldo, expense.value) }
  })
}

function applyTransferToAccounts(accounts: AccountV2[], transfer: Transfer): AccountV2[] {
  return accounts.map((account) => {
    if (account.id === transfer.from) return { ...account, saldo: subtractMoney(account.saldo, transfer.value) }
    if (account.id === transfer.to) return { ...account, saldo: addMoney(account.saldo, transfer.value) }
    return account
  })
}

export function useFinance(): FinanceContextValue {
  const context = useContext(FinanceContext)
  if (!context) throw new Error("useFinance precisa estar dentro de <FinanceProvider>")
  return context
}
