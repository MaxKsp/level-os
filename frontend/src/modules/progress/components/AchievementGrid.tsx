import { useMemo, useState } from "react"
import { Icon } from "../../../design-system"
import { cn } from "../../../lib/cn"
import type { Achievement, ProgressCategory } from "../contracts"

type AchievementFilter = "all" | "rotina" | "financeiro" | "treino" | "consistencia" | "marcos"

const FILTERS: { value: AchievementFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "rotina", label: "Rotina" },
  { value: "financeiro", label: "Finanças" },
  { value: "treino", label: "Treinos" },
  { value: "consistencia", label: "Sequência" },
  { value: "marcos", label: "Marcos" },
]

const CATEGORY_LABEL: Record<ProgressCategory, string> = {
  rotina: "Rotina",
  financeiro: "Finanças",
  treino: "Treinos",
  consistencia: "Sequência",
  nivel: "Nível",
  xp: "XP",
  geral: "Geral",
}

const CATEGORY_TONE: Record<ProgressCategory, string> = {
  rotina: "border-primary/30 bg-primary/8 text-primary",
  financeiro: "border-tertiary/30 bg-tertiary/8 text-tertiary",
  treino: "border-primary/30 bg-primary/8 text-primary",
  consistencia: "border-primary/30 bg-primary/8 text-primary",
  nivel: "border-primary/30 bg-primary/8 text-primary",
  xp: "border-primary/30 bg-primary/8 text-primary",
  geral: "border-primary/30 bg-primary/8 text-primary",
}

const CATEGORY_BAR: Record<ProgressCategory, string> = {
  rotina: "bg-primary",
  financeiro: "bg-tertiary",
  treino: "bg-primary",
  consistencia: "bg-primary",
  nivel: "bg-primary",
  xp: "bg-primary",
  geral: "bg-primary",
}

const CATEGORY_STATUS: Record<ProgressCategory, string> = {
  rotina: "bg-primary text-on-primary",
  financeiro: "bg-tertiary text-on-tertiary",
  treino: "bg-primary text-on-primary",
  consistencia: "bg-primary text-on-primary",
  nivel: "bg-primary text-on-primary",
  xp: "bg-primary text-on-primary",
  geral: "bg-primary text-on-primary",
}

function matchesFilter(category: ProgressCategory, filter: AchievementFilter): boolean {
  if (filter === "all") return true
  if (filter === "marcos") return category === "nivel" || category === "xp" || category === "geral"
  return category === filter
}

export function AchievementGrid({
  achievements,
  limit,
  className,
  showFilters = false,
}: {
  achievements: Achievement[]
  limit?: number
  className?: string
  showFilters?: boolean
}) {
  const [filter, setFilter] = useState<AchievementFilter>("all")
  const items = useMemo(() => {
    const filtered = achievements.filter((achievement) => matchesFilter(achievement.category ?? "geral", filter))
    return typeof limit === "number" ? filtered.slice(0, limit) : filtered
  }, [achievements, filter, limit])

  return (
    <div>
      {showFilters ? (
        <div className="mb-2 flex gap-5 overflow-x-auto border-b border-outline-variant" role="toolbar" aria-label="Filtrar conquistas">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={filter === item.value}
              onClick={() => setFilter(item.value)}
              className={cn(
                "shrink-0 border-b-2 px-0 py-2.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary motion-reduce:transition-none",
                filter === item.value ? "border-primary text-primary" : "border-transparent text-muted hover:text-on-surface",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      <ul className={cn("grid gap-x-6 sm:grid-cols-2", className)}>
        {items.map((achievement) => {
          const category = achievement.category ?? "geral"
          const current = Math.max(0, achievement.current ?? 0)
          const goal = Math.max(1, achievement.goal ?? 1)
          const percentage = Math.min(100, (current / goal) * 100)
          return (
            <li key={achievement.code} className="group flex min-w-0 items-start gap-3 border-b border-outline-variant py-4 transition-transform motion-safe:hover:-translate-y-0.5 motion-reduce:transition-none">
              <span className={cn("relative grid size-10 shrink-0 place-items-center rounded-lg border transition-[color,background-color,border-color,opacity]", CATEGORY_TONE[category], !achievement.unlocked && "opacity-[.58]")}>
                <Icon name={achievement.icon} className="text-[18px]" />
                <span className={cn("absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full border border-background text-[10px]", achievement.unlocked ? CATEGORY_STATUS[category] : "bg-surface-container-highest text-current")}>
                  <Icon name={achievement.unlocked ? "check" : "lock"} className="text-[10px]" />
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={cn("truncate text-sm font-medium", achievement.unlocked ? "text-on-surface" : "text-on-surface-variant")}>{achievement.title}</p>
                    <p className="mt-0.5 text-xs text-muted">{CATEGORY_LABEL[category]}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-primary">+{achievement.xp_bonus} XP</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted">{achievement.description}</p>
                {!achievement.unlocked ? (
                  <div className="mt-2">
                    <div className="mb-1 flex justify-between font-mono text-[10px] text-muted"><span>Progresso</span><span>{Math.min(current, goal).toLocaleString("pt-BR")}/{goal.toLocaleString("pt-BR")}</span></div>
                    <div className="h-1 overflow-hidden rounded-full bg-surface-container-highest" role="progressbar" aria-label={`Progresso de ${achievement.title}`} aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(current, goal)}>
                      <div className={cn("h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none", CATEGORY_BAR[category])} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
      {items.length === 0 ? <p className="py-8 text-center text-sm text-muted">Nenhuma conquista nesta categoria.</p> : null}
    </div>
  )
}
