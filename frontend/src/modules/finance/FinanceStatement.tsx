import { useMemo, useState } from "react"
import { BankLogo } from "../../components/ui/BankLogo"
import { Icon, SectionCard } from "../../design-system"
import { formatCurrency } from "../../lib/format"
import { cn } from "../../lib/cn"
import { useFinance } from "./store"

type Kind = "entrada" | "saida" | "transferencia"

export function FinanceStatement() {
  const fin = useFinance()
  const [kind, setKind] = useState<"todos" | Kind>("todos")
  const [accountId, setAccountId] = useState("todos")
  const [query, setQuery] = useState("")
  const rows = useMemo(() => {
    const expenses = fin.expenses.map((item) => ({ id: item.id, kind: "saida" as const, label: item.label, date: item.date ?? "", value: item.value, accountId: item.accountId, category: item.categoria ?? "Despesa" }))
    const variables = fin.variableIncome.map((item, index) => ({ id: item.id ?? `variable-${index}`, kind: "entrada" as const, label: item.label ?? "Renda variável", date: item.date ?? "", value: item.valor, accountId: item.accountId ?? null, category: item.source === "ofx" ? "Importação OFX" : "Renda variável" }))
    const incomes = fin.income.map((item) => ({ id: item.id, kind: "entrada" as const, label: item.label, date: item.endDate ?? "", value: item.value, accountId: item.accountId, category: item.type === "temporaria" ? "Renda temporária" : "Renda recorrente" }))
    const transfers = fin.transfers.map((item) => {
      const destination = fin.accounts.find((account) => account.id === item.to)
      return { id: item.id, kind: "transferencia" as const, label: `Transferência para ${destination?.label ?? "outra conta"}`, date: item.date ?? "", value: item.value, accountId: item.from ?? null, category: "Transferência entre contas" }
    })
    const needle = query.trim().toLocaleLowerCase("pt-BR")
    return [...expenses, ...variables, ...incomes, ...transfers]
      .filter((item) => kind === "todos" || item.kind === kind)
      .filter((item) => accountId === "todos" || item.accountId === accountId)
      .filter((item) => !needle || `${item.label} ${item.category}`.toLocaleLowerCase("pt-BR").includes(needle))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [accountId, fin.accounts, fin.expenses, fin.income, fin.transfers, fin.variableIncome, kind, query])

  return <SectionCard title="Extrato unificado" description="Entradas, saídas e importações OFX" bodyClassName="p-0">
    <div className="grid gap-2 border-b border-outline-variant p-4 md:grid-cols-[1fr_auto_auto]">
      <label className="relative"><Icon name="search" className="pointer-events-none absolute left-3 top-2.5 text-[18px] text-muted" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar no extrato" className="w-full rounded-xl border border-outline-variant bg-surface-container py-2 pl-10 pr-3 text-sm text-on-surface outline-none focus:border-primary" /></label>
      <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="rounded-xl border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"><option value="todos">Todas as contas</option>{fin.accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select>
      <div className="flex flex-wrap rounded-xl border border-outline-variant bg-surface-container p-1">{(["todos", "entrada", "saida", "transferencia"] as const).map((item) => <button key={item} onClick={() => setKind(item)} className={cn("rounded-lg px-3 py-1 text-xs capitalize", kind === item ? "bg-primary text-on-primary" : "text-muted hover:text-on-surface")}>{item === "saida" ? "saída" : item === "transferencia" ? "transferências" : item}</button>)}</div>
    </div>
    {rows.length ? <ul className="divide-y divide-outline-variant">{rows.map((row) => {
      const account = fin.accounts.find((item) => item.id === row.accountId)
      return <li key={`${row.kind}-${row.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-container/70">
        <BankLogo bank={account?.bank} size={36} />
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-on-surface">{row.label}</p><p className="truncate text-xs text-muted">{row.category}{account ? ` · ${account.label}` : ""}{row.date ? ` · ${row.date}` : ""}</p></div>
        <p className={cn("shrink-0 font-mono text-sm font-medium", row.kind === "entrada" ? "text-tertiary" : row.kind === "saida" ? "text-error" : "text-primary")}>{row.kind === "entrada" ? "+" : row.kind === "saida" ? "−" : "↔"} {formatCurrency(row.value)}</p>
      </li>
    })}</ul> : <div className="px-5 py-12 text-center text-sm text-muted">Nenhum lançamento encontrado com estes filtros.</div>}
  </SectionCard>
}
