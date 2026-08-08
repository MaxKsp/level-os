import { useEffect, useState } from "react"
import { Button } from "../../components/ui/Button"
import { CurrencyInput } from "../../components/ui/CurrencyInput"
import { userStorageKey } from "../../lib/userStorage"
import type { AccountV2, ExpenseLineV4 } from "./contracts"
import { CATEGORY_LABEL } from "./categories"
import { suggestExpenseCategory } from "./categorySuggestions"
import { isCard } from "./selectors"
import { genId } from "./store"

const field = "w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2.5 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
const label = "mb-1.5 block text-xs font-medium text-on-surface-variant"
const DRAFT_KEY = "level-os:expense-draft:v1"
const RECENT_ACCOUNT_KEY = "level-os:expense-recent-account:v1"

export function ExpenseForm({ accounts, resetKey, onCancel, onSave }: { accounts: AccountV2[]; resetKey?: string | number | boolean; onCancel: () => void; onSave: (expense: ExpenseLineV4) => void }) {
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [accountId, setAccountId] = useState("")
  const [category, setCategory] = useState("outros")
  const [recurrence, setRecurrence] = useState<"none" | "mensal">("none")
  const [method, setMethod] = useState("")
  const [installments, setInstallments] = useState("")
  const [error, setError] = useState("")
  const [categoryTouched, setCategoryTouched] = useState(false)

  useEffect(() => {
    let draft: Partial<Record<string, string>> = {}
    try { draft = JSON.parse(sessionStorage.getItem(userStorageKey(DRAFT_KEY)) ?? "{}") } catch { draft = {} }
    let recentId = ""
    try { recentId = sessionStorage.getItem(userStorageKey(RECENT_ACCOUNT_KEY)) ?? "" } catch { recentId = "" }
    const principal = accounts.find((account) => account.id === (draft.accountId || recentId))
      ?? accounts.find((account) => account.principal)
      ?? accounts[0]
    setDescription(draft.description ?? "")
    setAmount(draft.amount ?? "")
    setDate(draft.date ?? new Date().toLocaleDateString("sv-SE"))
    setTime(draft.time ?? "")
    setAccountId(principal?.id ?? "")
    setCategory(draft.category ?? "outros")
    setRecurrence(draft.recurrence === "mensal" ? "mensal" : "none")
    setMethod(draft.method ?? (principal && isCard(principal) ? "credito" : "debito"))
    setInstallments(draft.installments ?? "")
    setCategoryTouched(Boolean(draft.category))
    setError("")
  }, [accounts, resetKey])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        sessionStorage.setItem(userStorageKey(DRAFT_KEY), JSON.stringify({ description, amount, date, time, accountId, category, recurrence, method, installments }))
      } catch { /* O formulário continua funcional sem storage. */ }
    }, 250)
    return () => window.clearTimeout(timer)
  }, [accountId, amount, category, date, description, installments, method, recurrence, time])

  const account = accounts.find((item) => item.id === accountId)
  const installmentCount = Number(installments)
  const amountValue = Number(amount)
  const isInstallmentPurchase = Number.isInteger(installmentCount) && installmentCount >= 2

  const changeAccount = (nextId: string) => {
    const next = accounts.find((item) => item.id === nextId)
    setAccountId(nextId)
    if (next) setMethod(isCard(next) ? "credito" : "debito")
  }

  const changeDescription = (next: string) => {
    setDescription(next)
    if (!categoryTouched) {
      const suggestion = suggestExpenseCategory(next)
      if (suggestion) setCategory(suggestion)
    }
  }

  const submit = () => {
    const value = Number(amount)
    if (!account) return setError("Selecione uma conta ou cartão.")
    if (!description.trim()) return setError("Descreva a despesa.")
    if (!date || !Number.isFinite(value) || value <= 0) return setError("Informe data e valor maior que zero.")
    onSave({
      id: genId("exp"), label: description.trim(), value, date, time: time || null,
      recorrencia: recurrence, categoria: category, method: method || (isCard(account) ? "credito" : "debito"),
      bank: account.bank, accountId: account.id,
      parcelas: Number.isInteger(installmentCount) && installmentCount >= 2 ? installmentCount : null,
      createdAt: Math.floor(Date.now() / 1000),
    })
    try {
      sessionStorage.setItem(userStorageKey(RECENT_ACCOUNT_KEY), account.id)
      sessionStorage.removeItem(userStorageKey(DRAFT_KEY))
    } catch { /* Preferências de conveniência não bloqueiam o lançamento. */ }
    onCancel()
  }

  return (
    <div className="space-y-5">
      {accounts.length === 0 ? <p role="status" className="border-y border-outline-variant py-6 text-center text-sm text-muted">Cadastre uma conta ou cartão antes de lançar uma despesa.</p> : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className={label} htmlFor="expense-description">Descrição</label><input id="expense-description" className={field} value={description} onChange={(event) => changeDescription(event.target.value)} placeholder="Ex.: Supermercado" autoFocus /></div>
          <div><label className={label} htmlFor="expense-value">{isInstallmentPurchase ? "Valor da parcela" : "Valor"}</label><CurrencyInput id="expense-value" className={field} value={amount} onValueChange={setAmount} placeholder="R$ 0,00" />{isInstallmentPurchase && Number.isFinite(amountValue) && amountValue > 0 ? <p className="mt-1 text-xs text-muted">Total estimado: <span className="numeric-value">{(amountValue * installmentCount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></p> : null}</div>
          <div><label className={label} htmlFor="expense-account">Conta ou cartão</label><select id="expense-account" className={field} value={accountId} onChange={(event) => changeAccount(event.target.value)}>{accounts.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.bank ?? "Sem banco"}</option>)}</select></div>
          <div><label className={label} htmlFor="expense-date">Data</label><input id="expense-date" className={field} type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div>
          <div><label className={label} htmlFor="expense-time">Horário (opcional)</label><input id="expense-time" className={field} type="time" value={time} onChange={(event) => setTime(event.target.value)} /></div>
          <div><label className={label} htmlFor="expense-category">Categoria</label><select id="expense-category" className={field} value={category} onChange={(event) => { setCategory(event.target.value); setCategoryTouched(true) }}>{Object.entries(CATEGORY_LABEL).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select><p className="mt-1 text-xs text-muted">Sugerida pela descrição; você pode alterar.</p></div>
          <div><label className={label} htmlFor="expense-method">Forma de pagamento</label><select id="expense-method" className={field} value={method} onChange={(event) => setMethod(event.target.value)}><option value="debito">Débito</option><option value="credito">Crédito</option><option value="pix">Pix</option><option value="boleto">Boleto</option><option value="dinheiro">Dinheiro</option></select></div>
          <div><label className={label} htmlFor="expense-recurrence">Recorrência</label><select id="expense-recurrence" className={field} value={recurrence} onChange={(event) => setRecurrence(event.target.value as "none" | "mensal")}><option value="none">Não recorrente</option><option value="mensal">Conta fixa mensal</option></select></div>
          <div><label className={label} htmlFor="expense-installments">Parcelas (opcional)</label><input id="expense-installments" className={field} type="number" min="2" max="120" value={installments} onChange={(event) => setInstallments(event.target.value)} placeholder="Ex.: 6" /></div>
        </div>
      )}
      {error ? <p role="alert" className="text-sm text-error">{error}</p> : null}
      <div className="flex justify-end gap-2 border-t border-outline-variant pt-4"><Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button><Button type="button" disabled={!accounts.length} onClick={submit}>Lançar despesa</Button></div>
    </div>
  )
}
