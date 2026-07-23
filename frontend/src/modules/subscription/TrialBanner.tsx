import { Link } from "react-router-dom"
import { Icon } from "../../design-system"
import { useSubscription } from "./store"

export function TrialBanner() {
  const { subscription, status } = useSubscription()
  if (status !== "ready" || !subscription.in_trial || subscription.trial_days_left > 5) return null
  const days = subscription.trial_days_left
  return (
    <div role="status" className="fixed inset-x-0 top-16 z-40 border-b border-warning/35 bg-chrome text-warning md:left-64 md:top-0">
      <div className="mx-auto flex min-h-11 max-w-[1440px] items-center justify-center gap-2 px-4 text-center text-xs sm:px-6">
        <Icon name="timer" className="shrink-0 text-[16px]" />
        <span>Seu período gratuito termina em <strong className="numeric-value">{days} {days === 1 ? "dia" : "dias"}</strong>.</span>
        <Link to="/perfil#plan" className="min-h-11 content-center font-semibold text-on-surface underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary">Ver plano</Link>
      </div>
    </div>
  )
}
