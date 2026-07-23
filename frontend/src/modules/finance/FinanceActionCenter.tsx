import { useEffect, useState } from "react"
import { Modal } from "../../components/ui/Modal"
import { Icon } from "../../design-system"
import { cn } from "../../lib/cn"
import { AccountForm } from "./AccountFormModal"
import { ExpenseForm } from "./ExpenseForm"
import { IncomeForm } from "./IncomeForm"
import { OfxImportForm } from "./OfxImportModal"
import { TransferForm } from "./TransferFormModal"
import { useFinance } from "./store"

type MovementAction = "expense" | "income" | "transfer" | "account" | "ofx"

const actions: { value: MovementAction; label: string; icon: string }[] = [
  { value: "expense", label: "Despesa", icon: "payments" },
  { value: "income", label: "Renda", icon: "trending_up" },
  { value: "transfer", label: "Transferência", icon: "swap_horiz" },
  { value: "account", label: "Conta / cartão", icon: "account_balance" },
  { value: "ofx", label: "Importar OFX", icon: "upload_file" },
]

/** Um único diálogo; o segmento troca o formulário no mesmo contexto de foco. */
export function FinanceActionCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const fin = useFinance()
  const [action, setAction] = useState<MovementAction>("expense")

  useEffect(() => {
    if (open) setAction("expense")
  }, [open])

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Nova movimentação"
      description="Escolha o tipo e conclua sem abrir outra janela."
      icon="add_circle"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-5">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <div className="grid min-w-[620px] grid-cols-5 rounded-lg border border-outline-variant bg-surface-container p-1" role="tablist" aria-label="Tipo de movimentação">
            {actions.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={action === item.value}
                aria-controls={`movement-panel-${item.value}`}
                onClick={() => setAction(item.value)}
                className={cn(
                  "flex min-h-10 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                  action === item.value ? "bg-primary text-on-primary" : "text-muted hover:bg-surface-container-high hover:text-on-surface",
                )}
              >
                <Icon name={item.icon} className="text-[17px]" />{item.label}
              </button>
            ))}
          </div>
        </div>

        <div id={`movement-panel-${action}`} role="tabpanel" tabIndex={-1}>
          {action === "expense" ? <ExpenseForm accounts={fin.accounts} resetKey={open} onCancel={onClose} onSave={fin.addExpense} /> : null}
          {action === "income" ? <IncomeForm accounts={fin.accounts} resetKey={open} onCancel={onClose} onSaveIncome={fin.addIncome} onSaveVariable={fin.addVariableIncome} /> : null}
          {action === "transfer" ? <TransferForm accounts={fin.accounts} resetKey={open} onCancel={onClose} onSave={fin.addTransfer} /> : null}
          {action === "account" ? <AccountForm resetKey={open} onCancel={onClose} onSave={fin.addAccount} /> : null}
          {action === "ofx" ? <OfxImportForm onCancel={onClose} onComplete={onClose} /> : null}
        </div>
      </div>
    </Modal>
  )
}
