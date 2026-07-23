import { Icon } from "../../design-system"
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

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg border border-outline-variant bg-surface-container p-1" role="group" aria-label="Períodos rápidos">
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

          {preset === "custom" ? (
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2" aria-label="Intervalo personalizado">
              <label className="sr-only" htmlFor="finance-period-start">Data inicial</label>
              <input
                id="finance-period-start"
                type="date"
                value={customStart}
                max={customEnd}
                onChange={(event) => onCustomStartChange(event.target.value)}
                className="min-h-10 min-w-0 rounded-lg border border-outline-variant bg-surface-container px-2.5 text-xs text-on-surface"
              />
              <span className="text-xs text-muted" aria-hidden="true">até</span>
              <label className="sr-only" htmlFor="finance-period-end">Data final</label>
              <input
                id="finance-period-end"
                type="date"
                value={customEnd}
                min={customStart}
                onChange={(event) => onCustomEndChange(event.target.value)}
                className="min-h-10 min-w-0 rounded-lg border border-outline-variant bg-surface-container px-2.5 text-xs text-on-surface"
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
