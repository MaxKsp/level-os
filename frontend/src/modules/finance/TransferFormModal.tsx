import { useEffect, useMemo, useState } from "react"
import { BankLogo } from "../../components/ui/BankLogo"
import { Button } from "../../components/ui/Button"
import { Icon } from "../../design-system"
import { formatCurrency } from "../../lib/format"
import type { AccountV2, Transfer } from "./contracts"
import { isCard } from "./selectors"
import { genId } from "./store"

const field = "w-full rounded-xl border border-outline-variant bg-surface-container px-3 py-2.5 text-sm text-on-surface outline-none transition-colors focus:border-primary"
const label = "mb-1.5 block text-xs font-medium text-on-surface-variant"

export function TransferForm({ accounts, resetKey, onCancel, onSave }: { accounts: AccountV2[]; resetKey?: string | number | boolean; onCancel: () => void; onSave: (transfer: Transfer) => void }) {
  const available = useMemo(() => accounts.filter((account) => !isCard(account)), [accounts])
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [value, setValue] = useState("")
  const [date, setDate] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    const source = available.find((account) => account.principal) ?? available[0]
    setFrom(source?.id ?? "")
    setTo(available.find((account) => account.id !== source?.id)?.id ?? "")
    setValue("")
    setDate(new Date().toISOString().slice(0, 10))
    setError("")
  }, [available, resetKey])

  const source = available.find((account) => account.id === from)
  const destination = available.find((account) => account.id === to)

  const submit = () => {
    const amount = Number(value)
    if (!source || !destination || source.id === destination.id) { setError("Selecione duas contas diferentes."); return }
    if (!Number.isFinite(amount) || amount <= 0) { setError("Informe um valor maior que zero."); return }
    if (amount > source.saldo + source.chequeEspecial) { setError("O valor ultrapassa o saldo e o cheque especial disponíveis."); return }
    onSave({ id: genId("tr"), from: source.id, to: destination.id, value: amount, date, createdAt: Date.now() })
    onCancel()
  }

  return (
      <div className="space-y-4">
        {available.length < 2 ? (
          <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container p-6 text-center">
            <Icon name="account_balance" className="text-[28px] text-muted" />
            <p className="mt-2 text-sm font-medium text-on-surface">Cadastre pelo menos duas contas</p>
            <p className="mt-1 text-xs text-muted">Cartões de crédito não entram como destino de uma transferência.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
              <div>
                <label className={label}>Conta de origem</label>
                <select className={field} value={from} onChange={(event) => { setFrom(event.target.value); if (event.target.value === to) setTo(available.find((account) => account.id !== event.target.value)?.id ?? "") }}>
                  {available.map((account) => <option key={account.id} value={account.id}>{account.label} · {account.bank}</option>)}
                </select>
              </div>
              <span className="mb-1 hidden h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary sm:grid"><Icon name="arrow_forward" className="text-[19px]" /></span>
              <div>
                <label className={label}>Conta de destino</label>
                <select className={field} value={to} onChange={(event) => setTo(event.target.value)}>
                  {available.filter((account) => account.id !== from).map((account) => <option key={account.id} value={account.id}>{account.label} · {account.bank}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Valor (R$)</label><input className={field} type="number" min="0" step="0.01" value={value} onChange={(event) => setValue(event.target.value)} placeholder="0,00" autoFocus /></div>
              <div><label className={label}>Data</label><input className={field} type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div>
            </div>

            {source && destination ? (
              <div className="flex items-center gap-3 rounded-2xl border border-outline-variant bg-surface-container/75 p-3">
                <div className="flex -space-x-2"><BankLogo bank={source.bank} size={36} className="ring-2 ring-surface-container" /><BankLogo bank={destination.bank} size={36} className="ring-2 ring-surface-container" /></div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-on-surface">{source.label} → {destination.label}</p><p className="text-xs text-muted">Disponível na origem: {formatCurrency(source.saldo + source.chequeEspecial)}</p></div>
              </div>
            ) : null}
          </>
        )}

        {error ? <p role="alert" className="text-sm text-error">{error}</p> : null}
        <div className="flex justify-end gap-2 border-t border-outline-variant pt-4">
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button onClick={submit} disabled={available.length < 2}><Icon name="swap_horiz" className="text-[18px]" /> Transferir</Button>
        </div>
      </div>
  )
}
