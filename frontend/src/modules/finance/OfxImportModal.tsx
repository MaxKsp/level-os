import { useMemo, useState, type ChangeEvent } from "react"
import { Button } from "../../components/ui/button"
import { LevelSelect } from "../../components/ui/LevelSelect"
import { Icon } from "../../design-system"
import { ApiError } from "../../lib/apiErrors"
import { formatCurrency } from "../../lib/format"
import { cn } from "../../lib/cn"
import type { ExpenseLineV4, IfoodEntry } from "./contracts"
import { hasFinanceBackend, previewOfxServer } from "./api"
import { genId, useFinance } from "./store"
import { parseOfxClient, type OfxPreviewRow } from "./ofx"

const INVALID_FILE = "Não encontramos lançamentos válidos neste arquivo. Confira se é o extrato OFX exportado pelo seu banco."
const TOO_LARGE = "O arquivo deve ter no máximo 5 MB."

export function OfxImportForm({ onCancel, onComplete }: { onCancel: () => void; onComplete: () => void }) {
  const fin = useFinance()
  const [rows, setRows] = useState<OfxPreviewRow[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [accountId, setAccountId] = useState(fin.accounts.find((a) => a.principal)?.id ?? fin.accounts[0]?.id ?? "")
  const [file, setFile] = useState<File | null>(null)
  const [skipped, setSkipped] = useState(0)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const chosen = useMemo(() => rows.filter((row) => selected.has(row.id)), [rows, selected])

  // Duplicidade depende da conta de destino, então a prévia é refeita quando ela muda.
  const preview = async (target: File, account: string) => {
    setRows([]); setSelected(new Set()); setSkipped(0); setError(""); setFile(target)
    if (!/\.(ofx|qfx)$/i.test(target.name)) return setError("Selecione um arquivo .ofx ou .qfx.")
    if (target.size > 5 * 1024 * 1024) return setError(TOO_LARGE)
    setBusy(true)
    try {
      let parsed: OfxPreviewRow[]
      let ignored: number
      if (hasFinanceBackend()) {
        ({ rows: parsed, skipped: ignored } = await previewOfxServer(target, account))
      } else {
        const text = await target.text()
        const sameAccount = (id?: string | null) => !id || id === account
        parsed = parseOfxClient(text, [
          ...fin.expenses.filter((item) => sameAccount(item.accountId)).map((item) => ({ date: item.date, value: item.value, kind: "saida" as const })),
          ...fin.variableIncome.filter((item) => sameAccount(item.accountId)).map((item) => ({ date: item.date, value: item.valor, kind: "entrada" as const })),
        ])
        ignored = (text.match(/<STMTTRN>/gi)?.length ?? 0) - parsed.length
      }
      if (!parsed.length) return setError(INVALID_FILE)
      setRows(parsed)
      setSkipped(Math.max(0, ignored))
      setSelected(new Set(parsed.filter((row) => !row.duplicate).map((row) => row.id)))
    } catch (cause) {
      setError(cause instanceof ApiError
        ? cause.status === 400 ? INVALID_FILE : cause.status === 413 ? TOO_LARGE : cause.message
        : "Não foi possível ler o arquivo. Tente novamente.")
    } finally {
      setBusy(false)
    }
  }

  const readFile = (event: ChangeEvent<HTMLInputElement>) => {
    const target = event.target.files?.[0]
    event.target.value = ""
    if (target) void preview(target, accountId)
  }

  const changeAccount = (id: string) => {
    setAccountId(id)
    if (file) void preview(file, id)
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
    setRows([]); setSelected(new Set()); setFile(null); onComplete()
  }

  if (!fin.accounts.length) {
    return (
      <div className="rounded-2xl border border-dashed border-outline-variant p-5 text-center">
        <Icon name="account_balance" className="text-[30px] text-muted" />
        <p className="mt-2 text-sm font-semibold text-on-surface">Cadastre uma conta antes de importar</p>
        <p className="mt-1 text-xs text-muted">Os lançamentos do extrato entram no saldo da conta que você escolher.</p>
      </div>
    )
  }

  return (
      <div className="space-y-4">
        <label className="block text-sm font-medium text-on-surface-variant">
          Conta de destino
          <LevelSelect className="mt-1.5 w-full" value={accountId} onChange={changeAccount} disabled={busy} aria-label="Conta de destino" options={fin.accounts.map((account) => ({ value: account.id, label: `${account.label} · ${account.bank ?? "Sem banco"}` }))} />
        </label>

        <div className={cn("rounded-2xl border border-dashed p-5 text-center", error ? "border-error/40 bg-error/5" : "border-primary/45 bg-primary/5")}>
          <Icon name={error ? "error" : "account_balance_wallet"} className={cn("text-[30px]", error ? "text-error" : "text-primary")} />
          <p className="mt-2 text-sm font-semibold text-on-surface">{error ? "Escolha outro arquivo" : "Escolha o OFX exportado pelo seu banco"}</p>
          <p className="mt-1 text-xs text-muted">{hasFinanceBackend() ? "Validação segura no servidor" : "Prévia local"}, limite de 5 MB. Duplicidades prováveis nesta conta ficam desmarcadas.</p>
          <label className={cn("mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-on-primary", busy ? "opacity-50" : "cursor-pointer")}>
            <Icon name="attach_file" className="text-[18px]" /> {busy ? "Lendo…" : "Selecionar arquivo"}
            <input type="file" className="sr-only" accept=".ofx,.qfx,application/x-ofx" onChange={readFile} disabled={busy} />
          </label>
          {file ? <p className="mt-2 break-all text-xs text-on-surface-variant">{file.name}</p> : null}
          {error ? <p role="alert" className="mt-3 rounded-xl border border-error/25 bg-surface px-3 py-2 text-left text-xs text-error">{error}</p> : null}
        </div>

        {rows.length ? <>
          {skipped ? <p role="status" className="rounded-xl border border-warning/25 bg-warning/5 px-3 py-2 text-xs text-on-surface-variant">{skipped === 1 ? "1 lançamento foi ignorado" : `${skipped} lançamentos foram ignorados`} por não ter data ou valor válidos.</p> : null}
          <div className="max-h-64 overflow-auto rounded-xl border border-outline-variant">
            <table className="w-full min-w-[580px] text-left text-xs">
              <thead className="sticky top-0 bg-surface-container-high text-muted"><tr><th className="p-3">Importar</th><th>Data</th><th>Descrição</th><th>Tipo</th><th className="pr-3 text-right">Valor</th></tr></thead>
              <tbody className="divide-y divide-outline-variant">{rows.map((row) => <tr key={row.id} className={row.duplicate ? "opacity-55" : ""}>
                <td className="px-1"><label className="flex size-11 cursor-pointer items-center justify-center"><input type="checkbox" aria-label={`Importar ${row.desc} de ${row.date.split("-").reverse().join("/")}`} checked={selected.has(row.id)} onChange={(e) => setSelected((current) => { const next = new Set(current); e.target.checked ? next.add(row.id) : next.delete(row.id); return next })} className="size-4 accent-primary" /></label></td>
                <td className="font-mono text-muted">{row.date.split("-").reverse().join("/")}</td><td className="max-w-[250px] truncate text-on-surface">{row.desc}{row.duplicate ? <span className="ml-2 rounded bg-warning/15 px-1.5 py-0.5 text-warning">possível duplicado</span> : null}</td>
                <td className={row.kind === "entrada" ? "text-tertiary" : "text-error"}>{row.kind === "entrada" ? "Entrada" : "Saída"}</td><td className="pr-3 text-right font-mono text-on-surface">{formatCurrency(row.value)}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant pt-4">
            <p className="text-xs text-muted">{chosen.length} de {rows.length} selecionados</p>
            <div className="flex gap-2"><Button variant="ghost" onClick={onCancel}>Cancelar</Button><Button onClick={importRows} disabled={!chosen.length || !accountId || busy}>Importar lançamentos</Button></div>
          </div>
        </> : null}
      </div>
  )
}
