import { useEffect, useMemo, useState } from "react"
import { Button } from "../../components/ui/Button"
import { Icon } from "../../design-system"
import { formatCurrency } from "../../lib/format"
import type { AccountV2, IfoodEntry, IncomeLine } from "./contracts"
import { calculateSalary, EMPTY_SALARY_INPUT, type SalaryInput } from "./salary"
import { genId } from "./store"

type IncomeMode = "fixa" | "variavel" | "temporaria" | "avulsa" | "clt"

const MODES: { value: IncomeMode; label: string; description: string }[] = [
  { value: "fixa", label: "Fixa", description: "Recebimento recorrente" },
  { value: "variavel", label: "Variável", description: "Valor recorrente estimado" },
  { value: "temporaria", label: "Momentânea", description: "Tem uma data final" },
  { value: "avulsa", label: "Avulsa", description: "Acontece uma vez" },
  { value: "clt", label: "Salário CLT", description: "Bruto para líquido" },
]

const field = "w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2.5 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
const label = "mb-1.5 block text-xs font-medium text-on-surface-variant"

interface IncomeFormProps {
  accounts: AccountV2[]
  initial?: IncomeLine | null
  resetKey?: string | number | boolean
  onCancel: () => void
  onSaveIncome: (income: IncomeLine) => void
  onSaveVariable?: (entry: IfoodEntry) => void
}

function modeFromIncome(initial?: IncomeLine | null): IncomeMode {
  if (initial?.salaryDetails) return "clt"
  if (initial?.type === "temporaria") return "temporaria"
  if (initial?.type === "variavel") return "variavel"
  return "fixa"
}

export function IncomeForm({ accounts, initial, resetKey, onCancel, onSaveIncome, onSaveVariable }: IncomeFormProps) {
  const [mode, setMode] = useState<IncomeMode>(() => modeFromIncome(initial))
  const [labelValue, setLabelValue] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [payday, setPayday] = useState("5")
  const [accountId, setAccountId] = useState("")
  const [km, setKm] = useState("")
  const [salary, setSalary] = useState<SalaryInput>(EMPTY_SALARY_INPUT)
  const [error, setError] = useState("")

  useEffect(() => {
    const defaultAccount = accounts.find((account) => account.principal && account.tipo !== "cartao")
      ?? accounts.find((account) => account.tipo !== "cartao")
    const nextMode = modeFromIncome(initial)
    setMode(nextMode)
    setLabelValue(initial?.label ?? (nextMode === "clt" ? "Salário CLT" : ""))
    setAmount(initial?.value ? String(initial.value) : "")
    setDate(new Date().toLocaleDateString("sv-SE"))
    setEndDate(initial?.endDate ?? "")
    setPayday(initial?.payday ? String(initial.payday) : "5")
    setAccountId(initial?.accountId ?? defaultAccount?.id ?? "")
    setKm("")
    setSalary(initial?.salaryDetails ?? { ...EMPTY_SALARY_INPUT, grossSalary: initial?.value ?? 0 })
    setError("")
  }, [accounts, initial, resetKey])

  const estimate = useMemo(() => calculateSalary(salary), [salary])
  const availableModes = initial || !onSaveVariable ? MODES.filter((item) => item.value !== "avulsa") : MODES
  const recurring = mode !== "avulsa"

  const changeMode = (next: IncomeMode) => {
    setMode(next)
    setError("")
    if (next === "clt" && !labelValue.trim()) setLabelValue("Salário CLT")
  }

  const submit = () => {
    const cleanLabel = labelValue.trim()
    if (!cleanLabel) return setError("Descreva a renda.")
    if (!accountId && accounts.some((account) => account.tipo !== "cartao")) return setError("Selecione a conta de recebimento.")

    if (mode === "avulsa") {
      const value = Number(amount)
      if (!date || !Number.isFinite(value) || value <= 0) return setError("Informe data e valor maior que zero.")
      onSaveVariable?.({
        id: genId("var"), label: cleanLabel, valor: value, date, km: km ? Number(km) : null,
        accountId: accountId || null, source: "manual",
      })
      onCancel()
      return
    }

    const value = mode === "clt" ? estimate.netSalary : Number(amount)
    if (!Number.isFinite(value) || value <= 0) return setError(mode === "clt" ? "Informe um salário bruto válido." : "Informe um valor maior que zero.")
    if (mode === "temporaria" && !endDate) return setError("Informe o último recebimento.")
    const paydayValue = Number(payday)
    if (!Number.isInteger(paydayValue) || paydayValue < 1 || paydayValue > 31) return setError("O dia de pagamento deve ficar entre 1 e 31.")

    onSaveIncome({
      id: initial?.id || genId("inc"),
      label: cleanLabel,
      value,
      type: mode === "clt" ? "fixa" : mode,
      endDate: mode === "temporaria" ? endDate : null,
      payday: paydayValue,
      accountId: accountId || null,
      createdAt: initial?.createdAt ?? Math.floor(Date.now() / 1000),
      salaryDetails: mode === "clt" ? salary : null,
    })
    onCancel()
  }

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className={label}>Tipo de renda</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Tipo de renda">
          {availableModes.map((item) => (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={mode === item.value}
              onClick={() => changeMode(item.value)}
              className={`min-h-16 rounded-lg border px-2.5 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-primary ${mode === item.value ? "border-primary bg-primary/10" : "border-outline-variant bg-surface-container hover:border-outline"}`}
            >
              <span className="block text-xs font-semibold text-on-surface">{item.label}</span>
              <span className="mt-0.5 block text-[10px] leading-4 text-muted">{item.description}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label} htmlFor="income-description">Descrição</label>
          <input id="income-description" className={field} value={labelValue} onChange={(event) => setLabelValue(event.target.value)} placeholder={mode === "clt" ? "Ex.: Salário empresa" : "Ex.: Freelance, aluguel, benefício"} autoFocus />
        </div>

        {mode === "clt" ? (
          <SalaryFields salary={salary} onChange={setSalary} />
        ) : (
          <div>
            <label className={label} htmlFor="income-value">{mode === "avulsa" ? "Valor recebido" : "Valor por recebimento"}</label>
            <input id="income-value" className={field} type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" />
          </div>
        )}

        {mode === "avulsa" ? (
          <>
            <div><label className={label} htmlFor="income-date">Data</label><input id="income-date" className={field} type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div>
            <div><label className={label} htmlFor="income-km">Quilômetros (opcional)</label><input id="income-km" className={field} type="number" min="0" value={km} onChange={(event) => setKm(event.target.value)} /></div>
          </>
        ) : (
          <>
            <div><label className={label} htmlFor="income-payday">Dia de pagamento</label><input id="income-payday" className={field} type="number" min="1" max="31" value={payday} onChange={(event) => setPayday(event.target.value)} /></div>
            {mode === "temporaria" ? <div><label className={label} htmlFor="income-end">Último recebimento</label><input id="income-end" className={field} type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></div> : null}
          </>
        )}

        <div className={mode === "clt" ? "sm:col-span-2" : ""}>
          <label className={label} htmlFor="income-account">Conta de recebimento</label>
          <select id="income-account" className={field} value={accountId} onChange={(event) => setAccountId(event.target.value)}>
            <option value="">Sem conta vinculada</option>
            {accounts.filter((account) => account.tipo !== "cartao").map((account) => <option key={account.id} value={account.id}>{account.label}</option>)}
          </select>
        </div>
      </div>

      {mode === "clt" ? <SalaryPreview estimate={estimate} /> : null}
      {mode === "temporaria" ? <p className="border-l-2 border-primary pl-3 text-xs leading-5 text-muted">Após a data final, essa renda sai automaticamente das projeções.</p> : null}
      {recurring && mode !== "clt" ? <p className="text-xs text-muted">A renda recorrente é projetada uma vez por mês no dia informado.</p> : null}
      {error ? <p role="alert" className="text-sm text-error">{error}</p> : null}

      <div className="flex justify-end gap-2 border-t border-outline-variant pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="button" onClick={submit}>{initial ? "Salvar renda" : "Adicionar renda"}</Button>
      </div>
    </div>
  )
}

function SalaryFields({ salary, onChange }: { salary: SalaryInput; onChange: (salary: SalaryInput) => void }) {
  const setNumber = (key: keyof SalaryInput, value: string) => onChange({ ...salary, [key]: Math.max(0, Number(value) || 0) })
  return (
    <div className="contents">
      <div><label className={label} htmlFor="salary-gross">Salário bruto</label><input id="salary-gross" className={field} type="number" min="0" step="0.01" value={salary.grossSalary || ""} onChange={(event) => setNumber("grossSalary", event.target.value)} /></div>
      <div><label className={label} htmlFor="salary-dependents">Dependentes</label><input id="salary-dependents" className={field} type="number" min="0" step="1" value={salary.dependents || ""} onChange={(event) => setNumber("dependents", event.target.value)} /></div>
      <div><label className={label} htmlFor="salary-health">Plano de saúde (desconto)</label><input id="salary-health" className={field} type="number" min="0" step="0.01" value={salary.healthPlan || ""} onChange={(event) => setNumber("healthPlan", event.target.value)} /></div>
      <div><label className={label} htmlFor="salary-dental">Plano odontológico (desconto)</label><input id="salary-dental" className={field} type="number" min="0" step="0.01" value={salary.dentalPlan || ""} onChange={(event) => setNumber("dentalPlan", event.target.value)} /></div>
      <div><label className={label} htmlFor="salary-pension">Pensão alimentícia</label><input id="salary-pension" className={field} type="number" min="0" step="0.01" value={salary.pension || ""} onChange={(event) => setNumber("pension", event.target.value)} /></div>
      <div><label className={label} htmlFor="salary-other">Outros descontos</label><input id="salary-other" className={field} type="number" min="0" step="0.01" value={salary.otherDiscounts || ""} onChange={(event) => setNumber("otherDiscounts", event.target.value)} /></div>
      <label className="flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2.5 text-sm text-on-surface sm:col-span-2">
        <input type="checkbox" checked={salary.hasTransportVoucher} onChange={(event) => onChange({ ...salary, hasTransportVoucher: event.target.checked })} className="size-4 accent-primary" />
        Aplicar desconto de vale-transporte (limitado a 6% do bruto)
      </label>
      <div><label className={label} htmlFor="salary-vt">Benefício VT (informativo)</label><input id="salary-vt" className={field} type="number" min="0" step="0.01" value={salary.transportVoucherBenefit || ""} onChange={(event) => setNumber("transportVoucherBenefit", event.target.value)} /></div>
      <div><label className={label} htmlFor="salary-vr">Vale-refeição (informativo)</label><input id="salary-vr" className={field} type="number" min="0" step="0.01" value={salary.mealVoucher || ""} onChange={(event) => setNumber("mealVoucher", event.target.value)} /></div>
      <div><label className={label} htmlFor="salary-va">Vale-alimentação (informativo)</label><input id="salary-va" className={field} type="number" min="0" step="0.01" value={salary.foodAllowance || ""} onChange={(event) => setNumber("foodAllowance", event.target.value)} /></div>
    </div>
  )
}

function SalaryPreview({ estimate }: { estimate: ReturnType<typeof calculateSalary> }) {
  const rows = [
    ["Salário bruto", estimate.grossSalary],
    ["INSS", -estimate.inss],
    ["IRRF", -estimate.irrf],
    ["Vale-transporte", -estimate.transportVoucherDiscount],
    ["Plano de saúde", -estimate.healthPlan],
    ["Plano odontológico", -estimate.dentalPlan],
    ["Pensão", -estimate.pension],
    ["Outros descontos", -estimate.otherDiscounts],
  ] as const
  const benefitRows: [string, number][] = [
    ["VT", estimate.benefits.transportVoucher],
    ["VR", estimate.benefits.mealVoucher],
    ["VA", estimate.benefits.foodAllowance],
  ]
  const benefits = benefitRows.filter(([, value]) => value > 0)

  return (
    <section aria-live="polite" aria-label="Prévia do salário líquido" className="border-y border-outline-variant py-4">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-sm font-medium text-primary">Prévia do salário líquido</p><p className="mt-1 text-xs text-muted">Estimativa 2026; confirme os valores no holerite.</p></div>
        <p className="font-mono text-2xl font-semibold text-tertiary">{formatCurrency(estimate.netSalary)}</p>
      </div>
      <dl className="mt-4 grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
        {rows.map(([name, value]) => <div key={name} className="flex justify-between gap-3 border-b border-outline-variant/70 py-1.5"><dt className="text-muted">{name}</dt><dd className={value < 0 ? "font-mono text-error" : "font-mono text-on-surface"}>{value < 0 ? "−" : ""}{formatCurrency(Math.abs(value))}</dd></div>)}
      </dl>
      {benefits.length ? <div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-xs text-muted">Benefícios fora do líquido:</span>{benefits.map(([name, value]) => <span key={name} className="rounded-md bg-primary/10 px-2 py-1 text-[11px] text-primary">{name} {formatCurrency(value as number)}</span>)}</div> : null}
      <p className="mt-3 flex items-center gap-1 text-[11px] text-muted"><Icon name="info" className="text-[14px]" /> Base IRRF estimada: {formatCurrency(estimate.taxableBase)}.</p>
    </section>
  )
}
