import * as Dialog from "@radix-ui/react-dialog"
import { motion, useReducedMotion } from "motion/react"
import type { ReactNode } from "react"
import { Icon } from "../../design-system/Icon"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  icon?: string
  children: ReactNode
  maxWidth?: string
}

/** Diálogo-base do Level OS: foco gerenciado, tokens locais e movimento reduzido. */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  icon,
  children,
  maxWidth = "max-w-md",
}: ModalProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
            className="fixed inset-0 z-[110] bg-black/78"
          />
        </Dialog.Overlay>

        <div className="pointer-events-none fixed inset-0 z-[111] flex items-center justify-center p-4">
          <Dialog.Content asChild>
            <motion.div
              initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.97, y: shouldReduceMotion ? 0 : 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", duration: 0.3, bounce: 0.12 }}
              className={`pointer-events-auto relative flex max-h-[90vh] w-full ${maxWidth} flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low text-on-surface shadow-[var(--shadow-panel)] focus:outline-none`}
            >
              <div className="absolute left-6 top-0 h-[2px] w-14 bg-primary" />

              <header className="flex shrink-0 items-start justify-between gap-5 border-b border-outline-variant px-6 pb-4 pt-6">
                <div className="min-w-0">
                  <Dialog.Title className="flex items-center gap-2 font-sans text-base font-bold text-on-surface">
                    {icon ? <Icon name={icon} className="text-[20px] text-primary" /> : null}
                    {title}
                  </Dialog.Title>
                  <Dialog.Description className={description ? "mt-1 text-xs leading-5 text-muted" : "sr-only"}>
                    {description ?? `Janela de ${title}`}
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-2 focus-visible:outline-primary motion-reduce:transition-none"
                    aria-label="Fechar janela"
                  >
                    <Icon name="close" className="text-[19px]" />
                  </button>
                </Dialog.Close>
              </header>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                {children}
              </div>
            </motion.div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
