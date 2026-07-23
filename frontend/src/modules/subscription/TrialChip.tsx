import { Link } from "react-router-dom"
import { Icon } from "../../design-system"
import { cn } from "../../lib/cn"
import { useSubscription } from "./store"

export function TrialChip() {
  const { subscription, status } = useSubscription()
  if (status === "loading" || !subscription.in_trial) return null
  const urgent = subscription.trial_days_left <= 5
  return (
    <Link to="/perfil#plan" className={cn("flex min-h-10 w-full items-center gap-1.5 rounded-md border px-3 text-[11px] font-medium focus-visible:outline-2 focus-visible:outline-primary", urgent ? "border-warning/45 bg-warning/10 text-warning" : "border-primary/30 bg-primary/8 text-primary")}>
      <Icon name={urgent ? "timer" : "stars"} className="text-[15px]" />
      Nível grátis: {subscription.trial_days_left} {subscription.trial_days_left === 1 ? "dia" : "dias"}
    </Link>
  )
}
