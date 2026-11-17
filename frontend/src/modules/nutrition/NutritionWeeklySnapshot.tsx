import { CalendarCheck2, CircleCheck, PackageX, ReceiptText, TrendingUp } from "lucide-react"
import { useMemo, useState } from "react"
import type { DietPlan } from "./store"
import type { NutritionWorkspace } from "./nutritionWorkspace"
import { planWorkspaceId } from "./nutritionWorkspace"
import { mealCheckinSummary } from "./nutritionCheckin"

const brl = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const day = (date: Date) => [
  date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0"),
].join("-")

/** Relatorio de atividades declaradas: nunca infere ingestao, calorias ou pagamento. */
export function nutritionWeeklySummary(data: NutritionWorkspace, plan: DietPlan | null, now = new Date(), days: 7 | 30 = 7) {
  const from = day(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1)))
  const to = day(now)
  const expiry = day(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3))
  const diary = data.diary.filter((item) => item.date >= from && item.date <= to)
  const purchases = data.purchases.filter((item) => item.date >= from && item.date <= to)
  const expiring = data.pantry.filter((item) => item.quantity > 0 && item.expiresOn && item.expiresOn <= expiry)
  const checks = plan ? mealCheckinSummary(plan, data.mealChecks?.[planWorkspaceId(plan)] ?? {}) : null
  const daily = Array.from({ length: days }, (_, offset) => {
    const date = day(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - offset)))
    return { date, meals: diary.filter((entry) => entry.date === date).length }
  })
  return {
    from, to, meals: diary.length, recordedDays: new Set(diary.map((item) => item.date)).size,
    purchases: purchases.length, spent: purchases.reduce((sum, item) => sum + item.amountBRL, 0),
    expiring: expiring.length, checks, daily,
  }
}
export function NutritionWeeklySnapshot({ plan, workspace }: { plan: DietPlan | null; workspace: NutritionWorkspace }) {
  const [range, setRange] = useState<7 | 30>(7)
  const report = useMemo(() => nutritionWeeklySummary(workspace, plan, new Date(), range), [workspace, plan, range])
  const peak = Math.max(1, ...report.daily.map((entry) => entry.meals))
  const stats = [
    { label: "Refeicoes registradas", value: String(report.meals), detail: report.recordedDays + " dia(s) com registro", Icon: CalendarCheck2 },
    { label: "Compras declaradas", value: brl(report.spent), detail: report.purchases + " compra(s) no período", Icon: ReceiptText },
    { label: "Validade proxima", value: String(report.expiring), detail: "Itens vencidos ou ate 3 dias", Icon: PackageX },
    { label: "Check-in do plano", value: report.checks ? report.checks.consumed + "/" + report.checks.total : "—",
      detail: "Sequencia ativa; nao representa dias reais", Icon: CircleCheck },
  ]
  return (
    <section aria-label="Resumo alimentar" className="relative isolate overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low p-4 shadow-[var(--shadow-panel)] sm:p-6">
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 -z-10 size-80 rounded-full bg-primary/10 blur-[90px]" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-primary">
            <TrendingUp className="size-3.5" /> Nutrition / Workspace
          </span>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-on-surface sm:text-2xl">Seu acompanhamento alimentar</h2>
          <p className="mt-2 text-xs text-muted">Registros de {report.from.split("-").reverse().join("/")} a {report.to.split("-").reverse().join("/")}.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div role="group" aria-label="Período do resumo alimentar" className="inline-flex rounded-lg border border-outline-variant p-1">
            {([7, 30] as const).map((days) => <button key={days} type="button" aria-pressed={range === days}
              onClick={() => setRange(days)}
              className={"min-h-9 rounded-md px-3 text-xs font-semibold " + (range === days ? "bg-primary text-on-primary" : "text-muted hover:text-on-surface")}>
              {days} dias</button>)}
          </div>
          <button type="button" className="min-h-10 rounded-lg border border-primary/30 bg-primary/5 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
            onClick={() => document.getElementById("nutrition-workspace")?.scrollIntoView?.({ behavior: "smooth", block: "start" })}>
            Gerenciar registros
          </button>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {stats.map(({ label, value, detail, Icon }) => (
          <div key={label} className="min-w-0 rounded-xl border border-outline-variant bg-surface/65 p-3 sm:p-4">
            <span className="mb-4 grid size-8 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span>
            <strong className="block break-words text-xl font-semibold tabular-nums text-on-surface sm:text-2xl">{value}</strong>
            <span className="mt-2 block text-xs font-semibold text-on-surface">{label}</span>
            <small className="mt-1 block text-[10px] leading-4 text-muted">{detail}</small>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-outline-variant bg-surface/50 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-xs font-semibold text-on-surface">Frequência dos registros</h3>
          <span className="text-[11px] text-muted">{report.recordedDays}/{range} dias com diário preenchido</span>
        </div>
        <div role="img" aria-label={report.meals + " refeições registradas nos últimos " + range + " dias"}
          className="mt-3 flex h-16 items-end gap-1" >
          {report.daily.map((entry) => <div key={entry.date} className="flex h-full min-w-0 flex-1 items-end" title={entry.date.split("-").reverse().join("/") + ": " + entry.meals + " registro(s)"}>
            <span aria-hidden="true" className={"block w-full rounded-t-sm " + (entry.meals ? "bg-primary/75" : "bg-outline-variant")}
              style={{ height: entry.meals ? Math.max(12, entry.meals / peak * 100) + "%" : "3px" }} />
          </div>)}
        </div>
        <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted">
          <span>{report.from.split("-").reverse().join("/")}</span><span>{report.to.split("-").reverse().join("/")}</span>
        </div>
      </div>
      <p className="mt-4 text-[11px] leading-5 text-muted">
        Acompanhamento voluntario. Compras declaradas nao sao conciliadas com o banco.
        Check-ins refletem a sequencia de refeicoes do plano, nao consumo comprovado.
      </p>
    </section>
  )
}
