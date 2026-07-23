import { Modal } from "../../components/ui/Modal"
import type { AccountV2, IfoodEntry, IncomeLine } from "./contracts"
import { IncomeForm } from "./IncomeForm"

interface Props {
  open: boolean
  initial?: IncomeLine | null
  accounts: AccountV2[]
  onClose: () => void
  onSave: (income: IncomeLine) => void
  onSaveVariable?: (entry: IfoodEntry) => void
}

export function IncomeFormModal({ open, initial, accounts, onClose, onSave, onSaveVariable }: Props) {
  return (
    <Modal isOpen={open} onClose={onClose} title={initial ? "Editar renda" : "Cadastrar renda"} icon="payments" maxWidth="max-w-3xl">
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
