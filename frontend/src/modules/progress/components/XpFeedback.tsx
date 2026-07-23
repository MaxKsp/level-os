import { useEffect } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Icon } from "../../../design-system"
import { useProgress } from "../store"

const FEEDBACK_LABEL = {
  rotina: { label: "Rotina concluída", icon: "task_alt" },
  treino: { label: "Treino concluído", icon: "fitness_center" },
  financeiro: { label: "Finanças atualizadas", icon: "payments" },
} as const

export function XpFeedback() {
  const { feedback, dismissFeedback } = useProgress()
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(dismissFeedback, 3200)
    return () => window.clearTimeout(timer)
  }, [dismissFeedback, feedback])

  const meta = feedback ? FEEDBACK_LABEL[feedback.type] : null

  return (
    <AnimatePresence>
      {feedback && meta ? (
        <motion.aside
          key={feedback.id}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 12, scale: reduceMotion ? 1 : 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : 6, scale: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-20 right-4 z-[100] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-outline-variant bg-surface-container px-4 py-3 shadow-lg md:bottom-6 md:right-6"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-primary/25 bg-primary/8 text-primary">
              <Icon name={meta.icon} className="text-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-on-surface">{meta.label}</p>
              <p className="mt-0.5 text-xs text-muted">Seu progresso foi salvo com segurança.</p>
            </div>
            <strong className="shrink-0 font-mono text-sm font-medium text-primary">+{feedback.delta} XP</strong>
          </div>
          {feedback.unlocked.length ? (
            <div className="mt-3 flex items-center gap-2 border-t border-outline-variant pt-2 text-xs text-on-surface-variant">
              <Icon name="workspace_premium" className="text-[16px] text-warning" />
              {feedback.unlocked.length === 1 ? feedback.unlocked[0].title : `${feedback.unlocked.length} conquistas desbloqueadas`}
            </div>
          ) : null}
        </motion.aside>
      ) : null}
    </AnimatePresence>
  )
}
