import { useEffect, useMemo, useState } from "react"
import { TrendingUp } from "lucide-react"
import { Modal } from "../../components/ui/Modal"
import { Button } from "../../components/ui/Button"
import { formatCurrency } from "../../lib/format"
import type { AccountV2, IfoodEntry, IncomeLine } from "./contracts"
import { IncomeForm } from "./IncomeForm"
import { calculateSalary, type SalaryInput } from "./salary"
import { incomeStartIso } from "./incomeValidity"

interface Props {
  open: boolean
  initial?: IncomeLine | null
  accounts: AccountV2[]
  onClose: () => void
  onSave: (income: IncomeLine) => void
  onSaveVariable?: (entry: IfoodEntry) => void
  /** Reajuste com vigência: encerra a faixa atual e abre outra a partir do mês, sem reescrever o histórico. */
  onVersion?: (id: string, value: number, effectiveMonth: string, salaryDetails?: SalaryInput | null) => void
}

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function nextMonth(value: string): string {
  const [year, month] = value.split("-").map(Number)
  const next = new Date(year, month, 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`
}

function defaultEffectiveMonth(income: IncomeLine | null | undefined): string {
  const now = currentMonth()
  const start = income ? incomeStartIso(income)?.slice(0, 7) : null
  return start && now <= start ? nextMonth(start) : now
}

export function IncomeFormModal({ open, initial, accounts, onClose, onSave, onSaveVariable, onVersion }: Props) {
  const canVersion = Boolean(initial && initial.type === "fixa" && !initial.endDate && onVersion)
  const [raiseOpen, setRaiseOpen] = useState(false)
  const [raiseValue, setRaiseValue] = useState("")
  const [raiseMonth, setRaiseMonth] = useState(currentMonth)
  const [raiseError, setRaiseError] = useState("")

  const raiseNumeric = Number(raiseValue)
  const revisedSalary = useMemo<SalaryInput | null>(() => {
    if (!initial?.salaryDetails || !Number.isFinite(raiseNumeric) || raiseNumeric <= 0) return null
    return { ...initial.salaryDetails, grossSalary: raiseNumeric }
  }, [initial, raiseNumeric])
  const revisedNet = revisedSalary ? calculateSalary(revisedSalary).netSalary : raiseNumeric

  useEffect(() => {
    if (!open) return
    setRaiseOpen(false)
    setRaiseValue(initial ? String(initial.salaryDetails?.grossSalary ?? initial.value) : "")
    setRaiseMonth(defaultEffectiveMonth(initial))
    setRaiseError("")
  }, [initial, open])

  const applyRaise = () => {
    if (!initial || !onVersion) return
    if (!Number.isFinite(raiseNumeric) || raiseNumeric <= 0) {
      setRaiseError("Informe um valor maior que zero.")
      return
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(raiseMonth)) {
      setRaiseError("Informe um mês de vigência válido.")
      return
    }
    const currentStartMonth = incomeStartIso(initial)?.slice(0, 7)
    if (currentStartMonth && raiseMonth <= currentStartMonth) {
      setRaiseError("A nova vigência deve ser posterior ao início da faixa atual.")
      return
    }
    onVersion(initial.id, revisedNet, raiseMonth, revisedSalary)
    setRaiseOpen(false)
    setRaiseValue("")
    setRaiseError("")
    onClose()
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={initial ? "Editar renda" : "Cadastrar renda"} icon="payments" maxWidth="max-w-3xl">
      {canVersion ? (
        <div className="mb-4 rounded-xl border border-primary/30 bg-primary/[0.04] p-4">
          <button type="button" onClick={() => setRaiseOpen((v) => !v)} className="flex w-full items-center justify-between gap-2 text-left">
            <span className="flex items-center gap-2 text-sm font-semibold text-on-surface">
              <TrendingUp className="size-4 text-primary" />
              Reajuste de salário (preserva o histórico)
            </span>
            <span className="text-xs text-muted">{raiseOpen ? "Fechar" : "Abrir"}</span>
          </button>
          {raiseOpen ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label className="text-xs text-muted">
                {initial?.salaryDetails ? "Novo salário bruto" : "Novo valor mensal"}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={raiseValue}
                  onChange={(e) => setRaiseValue(e.target.value)}
                  placeholder="Ex.: 4000.00"
                  className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
                />
              </label>
              <label className="text-xs text-muted">
                A partir de
                <input
                  type="month"
                  value={raiseMonth}
                  onChange={(e) => setRaiseMonth(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
                />
              </label>
              <Button type="button" variant="primary" size="md" onClick={applyRaise} disabled={!(raiseNumeric > 0)}>
                Aplicar
              </Button>
              {revisedSalary ? (
                <p className="text-xs text-on-surface-variant sm:col-span-3">
                  Novo líquido estimado: <strong className="font-mono text-primary">{formatCurrency(revisedNet)}</strong>. Os descontos e benefícios cadastrados serão preservados.
                </p>
              ) : null}
              {raiseError ? <p role="alert" className="text-xs text-error sm:col-span-3">{raiseError}</p> : null}
              <p className="text-[11px] text-muted sm:col-span-3">Os meses anteriores mantêm o valor antigo. Use a edição abaixo apenas para corrigir um erro de digitação.</p>
            </div>
          ) : null}
        </div>
      ) : null}
      <IncomeForm
        accounts={accounts}
        initial={initial}
        resetKey={open}
        onCancel={onClose}
        onSaveIncome={onSave}
        onSaveVariable={onSaveVariable}
      />
    </Modal>
  )
}
