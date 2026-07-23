import { useMemo, useState, type ChangeEvent } from "react"
import { Button } from "../../components/ui/Button"
import { Icon } from "../../design-system"
import { formatCurrency } from "../../lib/format"
import type { ExpenseLineV4, IfoodEntry } from "./contracts"
import { hasFinanceBackend, previewOfxServer } from "./api"
import { genId, useFinance } from "./store"
import { parseOfxClient, type OfxPreviewRow } from "./ofx"

export function OfxImportForm({ onCancel, onComplete }: { onCancel: () => void; onComplete: () => void }) {
  const fin = useFinance()
  const [rows, setRows] = useState<OfxPreviewRow[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [accountId, setAccountId] = useState(fin.accounts.find((a) => a.principal)?.id ?? fin.accounts[0]?.id ?? "")
  const [fileName, setFileName] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const chosen = useMemo(() => rows.filter((row) => selected.has(row.id)), [rows, selected])

  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setError("")
    if (!/\.(ofx|qfx)$/i.test(file.name)) return setError("Selecione um arquivo .ofx ou .qfx.")
    if (file.size > 5 * 1024 * 1024) return setError("O arquivo deve ter no máximo 5 MB.")
    setBusy(true)
    try {
      const parsed = hasFinanceBackend()
        ? await previewOfxServer(file)
        : parseOfxClient(await file.text(), [
          ...fin.expenses.map((item) => ({ date: item.date, value: item.value })),
          ...fin.variableIncome.map((item) => ({ date: item.date, value: item.valor })),
        ])
      if (!parsed.length) throw new Error("Nenhum lançamento compatível foi encontrado.")
      setRows(parsed)
      setSelected(new Set(parsed.filter((row) => !row.duplicate).map((row) => row.id)))
      setFileName(file.name)
    } catch (cause) {
      setRows([])
      setError(cause instanceof Error ? cause.message : "Não foi possível ler o arquivo.")
    } finally {
      setBusy(false)
      event.target.value = ""
    }
  }

  const importRows = () => {
    const account = fin.accounts.find((item) => item.id === accountId)
    if (!account || !chosen.length) return
    const now = Math.floor(Date.now() / 1000)
    const expenses: ExpenseLineV4[] = chosen.filter((row) => row.kind === "saida").map((row) => ({
      id: genId("ofx-exp"), label: row.desc, value: row.value, date: row.date, time: null,
      recorrencia: "none", categoria: "outros", method: "ofx", bank: account.bank,
      accountId: account.id, parcelas: null, createdAt: now,
    }))
    const income: IfoodEntry[] = chosen.filter((row) => row.kind === "entrada").map((row) => ({
      id: genId("ofx-inc"), label: row.desc, valor: row.value, date: row.date,
      km: null, accountId: account.id, source: "ofx",
    }))
    if (expenses.length) fin.addExpenses(expenses)
    if (income.length) fin.addVariableIncomes(income)
    setRows([]); setSelected(new Set()); setFileName(""); onComplete()
  }

  return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-dashed border-primary/45 bg-primary/5 p-5 text-center">
          <Icon name="account_balance_wallet" className="text-[30px] text-primary" />
          <p className="mt-2 text-sm font-semibold text-on-surface">Escolha o OFX exportado pelo seu banco</p>
          <p className="mt-1 text-xs text-muted">{hasFinanceBackend() ? "Validação segura no servidor" : "Preview local"}, limite de 5 MB. Duplicidades prováveis ficam desmarcadas.</p>
          <label className="mt-4 inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-on-primary">
            <Icon name="attach_file" className="text-[18px]" /> {busy ? "Lendo…" : "Selecionar arquivo"}
            <input type="file" className="sr-only" accept=".ofx,.qfx,application/x-ofx" onChange={readFile} disabled={busy} />
          </label>
          {fileName ? <p className="mt-2 text-xs text-on-surface-variant">{fileName}</p> : null}
          {error ? <p role="alert" className="mt-2 text-xs text-error">{error}</p> : null}
        </div>

        {rows.length ? <>
          <label className="block text-sm font-medium text-on-surface-variant">
            Conta de destino
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="mt-1.5 w-full rounded-xl border border-outline-variant bg-surface-container px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-on-surface outline-none focus:border-primary">
              {fin.accounts.map((account) => <option key={account.id} value={account.id}>{account.label} · {account.bank ?? "Sem banco"}</option>)}
            </select>
          </label>
          <div className="max-h-64 overflow-auto rounded-xl border border-outline-variant">
            <table className="w-full min-w-[580px] text-left text-xs">
              <thead className="sticky top-0 bg-surface-container-high text-muted"><tr><th className="p-3">Importar</th><th>Data</th><th>Descrição</th><th>Tipo</th><th className="pr-3 text-right">Valor</th></tr></thead>
              <tbody className="divide-y divide-outline-variant">{rows.map((row) => <tr key={row.id} className={row.duplicate ? "opacity-55" : ""}>
                <td className="p-3"><input type="checkbox" checked={selected.has(row.id)} onChange={(e) => setSelected((current) => { const next = new Set(current); e.target.checked ? next.add(row.id) : next.delete(row.id); return next })} className="accent-primary" /></td>
                <td className="font-mono text-muted">{row.date}</td><td className="max-w-[250px] truncate text-on-surface">{row.desc}{row.duplicate ? <span className="ml-2 rounded bg-warning/15 px-1.5 py-0.5 text-warning">possível duplicado</span> : null}</td>
                <td className={row.kind === "entrada" ? "text-tertiary" : "text-error"}>{row.kind}</td><td className="pr-3 text-right font-mono text-on-surface">{formatCurrency(row.value)}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-outline-variant pt-4">
            <p className="text-xs text-muted">{chosen.length} de {rows.length} selecionados</p>
            <div className="flex gap-2"><Button variant="ghost" onClick={onCancel}>Cancelar</Button><Button onClick={importRows} disabled={!chosen.length || !accountId}>Importar lançamentos</Button></div>
          </div>
        </> : null}
      </div>
  )
}
