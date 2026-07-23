import { motion, useReducedMotion } from "motion/react"
import { Icon } from "../../design-system"
import { cn } from "../../lib/cn"
import { usePreferences } from "../../modules/preferences/store"

/** Toggle inspirado no Theme Toggle do 21st.dev, adaptado ao tema nativo do Vite. */
export function ThemeToggle({ className, showLabel = false }: { className?: string; showLabel?: boolean }) {
  const { theme, setAppearance } = usePreferences()
  const reduceMotion = useReducedMotion()

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark"
    setAppearance(next)
  }

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {showLabel ? <span className="text-sm text-on-surface-variant">{theme === "dark" ? "Escuro" : "Claro"}</span> : null}
      <motion.button
        type="button"
        role="switch"
        aria-checked={theme === "dark"}
        aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
        title={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
        onClick={toggle}
        whileTap={reduceMotion ? undefined : { scale: 0.94 }}
        className="relative flex h-8 w-[62px] shrink-0 items-center rounded-full border border-outline-variant bg-surface-container-high p-1 shadow-inner transition-colors focus-visible:outline-2 focus-visible:outline-primary"
      >
        <Icon name="dark_mode" className="z-10 grid h-6 w-6 place-items-center text-[15px] text-on-surface-variant" />
        <Icon name="light_mode" className="z-10 grid h-6 w-6 place-items-center text-[15px] text-on-surface-variant" />
        <motion.span
          aria-hidden="true"
          className="absolute left-1 top-1 h-6 w-6 rounded-full bg-primary shadow-[0_4px_14px_color-mix(in_srgb,var(--color-primary)_35%,transparent)]"
          animate={{ x: theme === "dark" ? 0 : 28 }}
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 30 }}
        />
      </motion.button>
    </div>
  )
}
