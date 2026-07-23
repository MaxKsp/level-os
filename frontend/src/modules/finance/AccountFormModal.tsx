import { useEffect, useState } from "react"
import { Modal } from "../../components/ui/Modal"
import { Button } from "../../components/ui/Button"
import { BankLogo } from "../../components/ui/BankLogo"
import { BankPicker } from "../../components/ui/BankPicker"
import type { AccountV2 } from "./contracts"
import { genId, useFinance } from "./store"

const TYPES: { value: string; label: string; card: boolean }[] = [
  { value: "conta", label: "Conta corrente", card: false },
  { value: "poupanca", label: "Poupança", card: false },
  { value: "pagamento", label: "Conta de pagamento", card: false },
  { value: "carteira", label: "Carteira digital", card: false },
  { value: "cartao", label: "Cartão de crédito", card: true },
]

const EMPTY: AccountV2 = {
  id: "", label: "", tipo: "conta", saldo: 0, chequeEspecial: 0, limite: 0,
  fatura: 0, fechamento: null, vencimento: null, bank: "Nubank", principal: false, createdAt: null,
}

const field = "w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none transition-colors focus:border-primary"
const lbl = "mb-1 block text-xs font-medium text-on-surface-variant"

interface Props {
  open: boolean
  initial?: AccountV2 | null
  onClose: () => void
  onSave: (a: AccountV2) => void
}

export function AccountFormModal({ open, initial, onClose, onSave }: Props) {
  return (
    <Modal isOpen={open} onClose={onClose} title={initial ? "Editar conta" : "Nova conta"} icon="account_balance" maxWidth="max-w-lg">
      <AccountForm initial={initial} resetKey={open} onCancel={onClose} onSave={onSave} />
    </Modal>
  )
}

export function AccountForm({ initial, resetKey, onCancel, onSave }: { initial?: AccountV2 | null; resetKey?: string | number | boolean; onCancel: () => void; onSave: (account: AccountV2) => void }) {
  const { bankFavorites, toggleBankFavorite } = useFinance()
  const [a, setA] = useState<AccountV2>(EMPTY)
  const [err, setErr] = useState("")

  useEffect(() => {
    setA(initial ? { ...initial } : { ...EMPTY })
    setErr("")
  }, [initial, resetKey])

  const isCard = TYPES.find((t) => t.value === a.tipo)?.card ?? false
  const set = (patch: Partial<AccountV2>) => setA((x) => ({ ...x, ...patch }))
  const bankName = a.bank ?? ""

  const submit = () => {
    if (!a.label.trim()) { setErr("Dê um nome à conta."); return }
    onSave({ ...a, id: a.id || genId(isCard ? "card" : "acc"), bank: bankName, createdAt: a.createdAt ?? Date.now() })
    onCancel()
  }

  return (
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-[.8fr_1.2fr]">
          <div>
            <label className={lbl}>Tipo</label>
            <select className={field} value={a.tipo} onChange={(e) => set({ tipo: e.target.value })}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Banco</label>
            <div className="flex items-center gap-2">
              <BankLogo bank={bankName} size={38} />
              <BankPicker className="min-w-0 flex-1" value={bankName} onChange={(bank) => set({ bank })} favorites={bankFavorites} onToggleFavorite={toggleBankFavorite} />
            </div>
          </div>
        </div>

        <div>
          <label className={lbl}>Nome / apelido</label>
          <input className={field} value={a.label} onChange={(e) => set({ label: e.target.value })} placeholder="Ex.: Conta principal" autoFocus />
        </div>

        {isCard ? (
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Limite (R$)</label><input type="number" className={field} value={a.limite || ""} onChange={(e) => set({ limite: Number(e.target.value) })} /></div>
            <div><label className={lbl}>Fatura atual (R$)</label><input type="number" className={field} value={a.fatura || ""} onChange={(e) => set({ fatura: Number(e.target.value) })} /></div>
            <div><label className={lbl}>Dia de fechamento</label><input type="number" min={1} max={31} className={field} value={a.fechamento ?? ""} onChange={(e) => set({ fechamento: e.target.value ? Number(e.target.value) : null })} /></div>
            <div><label className={lbl}>Dia de vencimento</label><input type="number" min={1} max={31} className={field} value={a.vencimento ?? ""} onChange={(e) => set({ vencimento: e.target.value ? Number(e.target.value) : null })} /></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Saldo inicial (R$)</label><input type="number" className={field} value={a.saldo || ""} onChange={(e) => set({ saldo: Number(e.target.value) })} /></div>
            <div><label className={lbl}>Cheque especial (R$)</label><input type="number" className={field} value={a.chequeEspecial || ""} onChange={(e) => set({ chequeEspecial: Number(e.target.value) })} /></div>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-on-surface">
          <input type="checkbox" checked={a.principal} onChange={(e) => set({ principal: e.target.checked })} className="h-4 w-4 accent-[color:var(--color-primary)]" />
          Definir como conta principal
        </label>

        {err ? <p className="text-sm text-error">{err}</p> : null}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="md" onClick={onCancel}>Cancelar</Button>
          <Button variant="primary" size="md" onClick={submit}>{initial ? "Salvar" : "Criar conta"}</Button>
        </div>
      </div>
  )
}
