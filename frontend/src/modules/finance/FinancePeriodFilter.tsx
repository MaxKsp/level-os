import { Icon } from "../../design-system"
import { LevelDateInput } from "../../components/ui/LevelDateInput"
import { cn } from "../../lib/cn"
import type { FinanceDateRange, FinancePeriodPreset } from "./period"

export interface FinancePeriodOption { value: Exclude<FinancePeriodPreset, "custom">; label: string }

const DEFAULT_OPTIONS: FinancePeriodOption[] = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
  { value: "month", label: "Mês atual" },
]

interface FinancePeriodFilterProps {
  preset: FinancePeriodPreset
  range: FinanceDateRange
  customStart: string
  customEnd: string
  onPresetChange: (value: FinancePeriodPreset) => void
  onCustomStartChange: (value: string) => void
  onCustomEndChange: (value: string) => void
  options?: FinancePeriodOption[]
  title?: string
}

export function FinancePeriodFilter({
  preset,
  range,
  customStart,
  customEnd,
  onPresetChange,
  onCustomStartChange,
  onCustomEndChange,
  options = DEFAULT_OPTIONS,
  title = "Período da análise",
}: FinancePeriodFilterProps) {
  return (
    <section className="border-y border-outline-variant py-3 sm:py-4" aria-labelledby="period-filter-title">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
            <Icon name="date_range" className="text-[19px]" />
          </span>
          <div className="min-w-0">
            <h2 id="period-filter-title" className="text-sm font-semibold text-on-surface">{title}</h2>
            <p className="truncate text-xs text-muted" aria-live="polite">{range.label}</p>
          </div>
        </div>

        <div className="flex w-full min-w-0 flex-col gap-2 lg:w-[25.5rem] lg:shrink-0">
          <div className="-mx-1 max-w-full overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex sm:flex-wrap sm:overflow-visible sm:rounded-lg sm:border sm:border-outline-variant sm:bg-surface-container sm:p-1" role="group" aria-label="Períodos rápidos">
            <div className="flex min-w-max gap-1 sm:min-w-0 sm:flex-wrap">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={preset === option.value}
                onClick={() => onPresetChange(option.value)}
                className={cn(
                  "min-h-8 shrink-0 rounded-md px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                  preset === option.value
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
                )}
              >
                {option.label}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={preset === "custom"}
              onClick={() => onPresetChange("custom")}
              className={cn(
                "min-h-8 shrink-0 rounded-md px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                preset === "custom"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
              )}
            >
              Personalizado
            </button>
            </div>
          </div>

          <div className="grid min-h-11 min-w-0 grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]" aria-label="Intervalo personalizado"
            aria-hidden={preset !== "custom"}>
            <label className={cn("min-w-0", preset !== "custom" && "invisible pointer-events-none")} htmlFor="finance-period-start">
              <span className="sr-only">Data inicial</span>
              <LevelDateInput id="finance-period-start" aria-label="Data inicial" value={customStart} max={customEnd}
                disabled={preset !== "custom"} onChange={(event) => onCustomStartChange(event.target.value)} />
            </label>
            <span className={cn("hidden text-xs text-muted sm:inline", preset !== "custom" && "invisible")} aria-hidden="true">até</span>
            <label className={cn("min-w-0", preset !== "custom" && "invisible pointer-events-none")} htmlFor="finance-period-end">
              <span className="sr-only">Data final</span>
              <LevelDateInput id="finance-period-end" aria-label="Data final" value={customEnd} min={customStart}
                disabled={preset !== "custom"} onChange={(event) => onCustomEndChange(event.target.value)} />
            </label>
          </div>
        </div>
      </div>
    </section>
  )
}
