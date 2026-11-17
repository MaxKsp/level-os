import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { FinanceProvider, useFinance } from "../modules/finance/store"
import { ProgressProvider } from "../modules/progress/store"
import { OfxImportForm } from "../modules/finance/OfxImportModal"

const account = (id: string, label: string, principal: boolean) => ({
  id, label, tipo: "conta", saldo: 0, chequeEspecial: 0, limite: 0, fatura: 0,
  fechamento: null, vencimento: null, bank: "Inter", principal, createdAt: 1,
})

const BOOTSTRAP = {
  accounts_v2: [account("acc-a", "Conta A", false), account("acc-b", "Conta B", true)],
  income_lines: [], expense_lines_v4: [], "ifood-entries": [], vaults: [], transfers: [],
  acc_view: "conta", bank_favorites: [],
}

const json = (body: unknown, status = 200) => ({ ok: status < 300, status, json: async () => body }) as unknown as Response

function Form() {
  const fin = useFinance()
  return fin.syncStatus === "synced" ? <OfxImportForm onCancel={() => undefined} onComplete={() => undefined} /> : <p>carregando</p>
}

async function mount(previewResponse: Response) {
  const uploads: FormData[] = []
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.includes("import-ofx.php")) { uploads.push(init?.body as FormData); return previewResponse }
    if (url.includes("data.php") && init?.method !== "POST") return json(BOOTSTRAP)
    return json({ ok: true })
  }))
  const view = render(<ProgressProvider><FinanceProvider><Form /></FinanceProvider></ProgressProvider>)
  await waitFor(() => expect(screen.getByText("Conta de destino")).toBeTruthy())
  const choose = async (name: string) => {
    const input = view.container.querySelector<HTMLInputElement>("input[type=file]")!
    await act(async () => { fireEvent.change(input, { target: { files: [new File(["<OFX>"], name)] } }) })
  }
  return { uploads, choose }
}

describe("OfxImportForm", () => {
  beforeEach(() => { localStorage.clear(); window.CSRF_TOKEN = "token-de-teste" })
  afterEach(() => { vi.unstubAllGlobals(); delete window.CSRF_TOKEN })

  it("mostra erro claro quando o servidor recusa o arquivo", async () => {
    const { choose } = await mount(json({ error: "arquivo não parece ser OFX" }, 400))
    await choose("extrato.ofx")
    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toContain("Não encontramos lançamentos válidos neste arquivo")
    expect(alert.textContent).not.toContain("parece ser OFX")
    expect(screen.queryByRole("table")).toBeNull()
  })

  it("recusa extensão errada sem enviar ao servidor", async () => {
    const { uploads, choose } = await mount(json({ ok: true, rows: [] }))
    await choose("planilha.csv")
    expect((await screen.findByRole("alert")).textContent).toBe("Selecione um arquivo .ofx ou .qfx.")
    expect(uploads).toHaveLength(0)
  })

  it("envia a conta de destino, avisa linhas ignoradas e rotula a prévia", async () => {
    const { uploads, choose } = await mount(json({
      ok: true, skipped: 2,
      rows: [
        { date: "2026-07-10", value: 54.9, kind: "expense", desc: "Mercado", fitid: "F1", dup: false },
        { date: "2026-07-11", value: 1200, kind: "income", desc: "Cliente", fitid: "F2", dup: true },
      ],
    }))
    await choose("extrato.ofx")
    await screen.findByRole("table")
    expect(uploads[0].get("account_id")).toBe("acc-b")
    expect(screen.getByRole("status").textContent).toContain("2 lançamentos foram ignorados")
    expect(screen.getByText("Saída")).toBeTruthy()
    expect(screen.getByText("Entrada")).toBeTruthy()
    const mercado = screen.getByRole("checkbox", { name: "Importar Mercado de 10/07/2026" }) as HTMLInputElement
    const cliente = screen.getByRole("checkbox", { name: "Importar Cliente de 11/07/2026" }) as HTMLInputElement
    expect(mercado.checked).toBe(true)
    expect(cliente.checked).toBe(false)
    expect(screen.getByText("1 de 2 selecionados")).toBeTruthy()
  })
})
