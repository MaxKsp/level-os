import { Badge, Card, CardHeader, Icon, Sparkline } from "@/design-system"
import { formatWeight } from "@/lib/format"
import type { WeightRecord, WorkoutSession } from "@/modules/training/contracts"
import { trainingSummary } from "@/modules/training/selectors"

interface TrainingOverviewProps {
  workout: WorkoutSession
  weights: WeightRecord[]
}

export function TrainingOverview({ workout, weights }: TrainingOverviewProps) {
  const summary = trainingSummary(workout, weights)
  const weightValues = weights.map((w) => w.weight)

  return (
    <Card hoverGlow={false} className="flex flex-col overflow-hidden">
      <CardHeader
        title="Treino de hoje"
        description={summary.focus}
        action={<Badge tone="primary">{summary.durationMin} min</Badge>}
      />

      <div className="px-5 py-5 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Sessão
            </p>
            <h3 className="mt-1 font-semibold text-on-surface">
              {summary.title}
            </h3>
          </div>
          <p className="font-mono text-sm text-on-surface-variant">
            {summary.completed}/{summary.total}
          </p>
        </div>

        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-surface-container-highest"
          role="progressbar"
          aria-label="Progresso do treino"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={summary.progress}
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${summary.progress}%` }}
          />
        </div>

        <ul className="mt-4 space-y-1.5">
          {workout.exercises.slice(0, 3).map((ex) => (
            <li
              key={ex.id}
              className="flex items-center gap-2.5 text-sm"
            >
              <Icon
                name={ex.completed ? "check_circle" : "radio_button_unchecked"}
                filled={ex.completed}
                className={
                  ex.completed
                    ? "text-[18px] text-tertiary"
                    : "text-[18px] text-muted"
                }
              />
              <span
                className={
                  ex.completed
                    ? "flex-1 text-muted line-through"
                    : "flex-1 text-on-surface"
                }
              >
                {ex.name}
              </span>
              <span className="font-mono text-xs text-muted">{ex.sets}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto border-t border-outline-variant px-5 py-4 sm:px-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-on-surface-variant">Peso atual</p>
            <p className="mt-1 font-mono text-2xl font-medium text-on-surface">
              {formatWeight(summary.currentWeight)}
            </p>
            <p className="mt-1 text-xs font-medium text-tertiary">
              {summary.weightDelta === 0
                ? "Estável na semana"
                : `${summary.weightDelta > 0 ? "+" : "−"}${Math.abs(summary.weightDelta).toFixed(1)} kg na semana`}
            </p>
          </div>
          <Sparkline
            values={weightValues}
            tone="tertiary"
            width={140}
            height={48}
            className="h-12 w-32"
            ariaLabel="Tendência de peso"
          />
        </div>
      </div>
    </Card>
  )
}
