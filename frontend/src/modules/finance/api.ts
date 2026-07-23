import type { FinanceBootstrap } from "./contracts"
import type { OfxPreviewRow } from "./ofx"

declare global {
  interface Window {
    CSRF_TOKEN?: string
  }
}

const FINANCE_KEYS = ["accounts_v2", "income_lines", "expense_lines_v4", "ifood-entries"] as const
export type FinanceSetKey = (typeof FINANCE_KEYS)[number]
export type FinanceAuxKey = "bank_favorites" | "transfers"

export function hasFinanceBackend(): boolean {
  return typeof window !== "undefined" && Boolean(window.CSRF_TOKEN)
}

async function readJson(response: Response): Promise<unknown> {
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body ? String(body.error) : `Erro HTTP ${response.status}`
    throw new Error(message)
  }
  return body
}

export async function loadFinanceBootstrap(): Promise<FinanceBootstrap> {
  const response = await fetch("/api/data.php?all=1", { credentials: "same-origin", headers: { Accept: "application/json" } })
  const body = await readJson(response)
  if (!body || typeof body !== "object") throw new Error("Resposta financeira inválida.")
  const data = body as Record<string, unknown>

  return {
    accounts_v2: Array.isArray(data.accounts_v2) ? data.accounts_v2 as FinanceBootstrap["accounts_v2"] : [],
    income_lines: Array.isArray(data.income_lines) ? data.income_lines as FinanceBootstrap["income_lines"] : [],
    expense_lines_v4: Array.isArray(data.expense_lines_v4) ? data.expense_lines_v4 as FinanceBootstrap["expense_lines_v4"] : [],
    "ifood-entries": Array.isArray(data["ifood-entries"]) ? data["ifood-entries"] as FinanceBootstrap["ifood-entries"] : [],
    vaults: Array.isArray(data.vaults) ? data.vaults as FinanceBootstrap["vaults"] : [],
    transfers: Array.isArray(data.transfers) ? data.transfers as FinanceBootstrap["transfers"] : [],
    acc_view: data.acc_view === "banco" ? "banco" : "conta",
    bank_favorites: Array.isArray(data.bank_favorites) ? data.bank_favorites.filter((bank): bank is string => typeof bank === "string").slice(0, 5) : [],
  }
}

export async function saveFinanceSet(key: FinanceSetKey, value: unknown[]): Promise<void> {
  const response = await fetch("/api/finance.php", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": window.CSRF_TOKEN ?? "" },
    body: JSON.stringify({ key, value }),
  })
  await readJson(response)
}

export async function saveFinanceAuxiliary(key: FinanceAuxKey, value: unknown): Promise<void> {
  const response = await fetch("/api/data.php", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": window.CSRF_TOKEN ?? "" },
    body: JSON.stringify({ key, value }),
  })
  await readJson(response)
}

interface ServerOfxRow {
  date?: unknown
  value?: unknown
  kind?: unknown
  desc?: unknown
  fitid?: unknown
  dup?: unknown
}

export async function previewOfxServer(file: File): Promise<OfxPreviewRow[]> {
  const form = new FormData()
  form.append("ofx", file)
  const response = await fetch("/api/import-ofx.php", {
    method: "POST",
    credentials: "same-origin",
    headers: { "X-CSRF-Token": window.CSRF_TOKEN ?? "" },
    body: form,
  })
  const body = await readJson(response)
  const rows = body && typeof body === "object" && "rows" in body && Array.isArray(body.rows) ? body.rows as ServerOfxRow[] : []

  return rows.flatMap((row, index) => {
    const value = Number(row.value)
    if (!Number.isFinite(value) || value <= 0 || typeof row.date !== "string") return []
    const fitid = typeof row.fitid === "string" && row.fitid ? row.fitid : null
    return [{
      id: fitid ?? `ofx-server-${row.date}-${index}`,
      date: row.date,
      value,
      kind: row.kind === "income" ? "entrada" as const : "saida" as const,
      desc: typeof row.desc === "string" && row.desc.trim() ? row.desc.trim() : "Lançamento OFX",
      fitid,
      duplicate: Boolean(row.dup),
    }]
  })
}
