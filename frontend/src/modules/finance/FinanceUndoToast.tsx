import { AnimatePresence, useReducedMotion } from "motion/react"
import * as m from "motion/react-m"
import { Button } from "../../components/ui/button"
import { Icon } from "../../design-system"
import { useFinance } from "./store"

export function FinanceUndoToast() {
  const { undoableExpense, undoLastExpense, dismissUndo } = useFinance()
  const reduceMotion = useReducedMotion()
  return (
    <AnimatePresence>
      {undoableExpense ? (
        <m.aside
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
          className="fixed bottom-20 right-4 z-[115] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-high px-4 py-3 shadow-lg md:bottom-6"
        >
          <Icon name="check_circle" filled className="text-[19px] text-tertiary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-on-surface">Despesa registrada</p>
            <p className="truncate text-xs text-muted">{undoableExpense.label}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={undoLastExpense}>Desfazer</Button>
          <button type="button" onClick={dismissUndo} aria-label="Fechar aviso" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-container-highest"><Icon name="close" className="text-[16px]" /></button>
        </m.aside>
      ) : null}
    </AnimatePresence>
  )
}
