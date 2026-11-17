import { act, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { FinanceProvider, genId, useFinance } from "../modules/finance/store"
import { ProgressProvider } from "../modules/progress/store"
import type { IncomeLine } from "../modules/finance/contracts"
import { ApiError, apiErrorCode, describeApiError, normalizeApiErrorCode } from "../lib/apiErrors"

/**
 * Incidente "plan_required": renda recusada pelo servidor não pode virar item
 * fantasma, e o código interno não pode aparecer na interface.
 */

const BOOTSTRAP = {
  accounts_v2: [{
    id: "acc-1", label: "Conta principal", tipo: "conta", saldo: 500, chequeEspecial: 0, limite: 0,
    fatura: 0, fechamento: null, vencimento: null, bank: "Inter", principal: true, createdAt: 1,
  }],
  income_lines: [],
  expense_lines_v4: [],
  "ifood-entries": [],
  vaults: [],
  transfers: [],
  acc_view: "conta",
  bank_favorites: [],
}

const income = (label: string): IncomeLine => ({
  id: genId("inc"), label, value: 4200, type: "fixa", date: "2026-08-01", endDate: null,
  payday: 5, accountId: "acc-1", createdAt: 1, salaryDetails: null,
})

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

function Probe() {
  const fin = useFinance()
  return (
    <div>
      <span data-testid="income-count">{fin.income.length}</span>
      <span data-testid="favorite-count">{fin.bankFavorites.length}</span>
      <span data-testid="status">{fin.syncStatus}</span>
      <span data-testid="error">{fin.syncError ?? ""}</span>
      <span data-testid="code">{fin.syncErrorCode ?? ""}</span>
      <span data-testid="upgrade">{String(fin.syncRequiresUpgrade)}</span>
      <button onClick={() => { void fin.addIncome(income("Salário")).catch(() => undefined) }}>add-income</button>
      <button onClick={() => fin.toggleBankFavorite("Inter")}>toggle-favorite</button>
      <button onClick={() => { void fin.refresh().catch(() => undefined) }}>refresh</button>
    </div>
  )
}

async function mountRemote() {
  render(<ProgressProvider><FinanceProvider><Probe /></FinanceProvider></ProgressProvider>)
  await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("synced"))
}

describe("mapa central de erros", () => {
  it("classifica códigos e status HTTP conhecidos", () => {
    expect(normalizeApiErrorCode("plan_required", 402)).toBe("plan_required")
    expect(normalizeApiErrorCode("paid_plan_required", 402)).toBe("plan_required")
    expect(normalizeApiErrorCode("invalid csrf token", 403)).toBe("csrf_invalid")
    expect(normalizeApiErrorCode("payload too large", 413)).toBe("validation_failed")
    expect(normalizeApiErrorCode(null, 401)).toBe("authentication_required")
    expect(normalizeApiErrorCode(null, 429)).toBe("rate_limited")
    expect(normalizeApiErrorCode(null, 503)).toBe("service_unavailable")
    expect(normalizeApiErrorCode("coisa_desconhecida", 500)).toBe("synchronization_failed")
  })

  it("nunca devolve o código interno como mensagem ao usuário", () => {
    const copy = describeApiError(new ApiError("plan_required", 402, "individual"))
    expect(copy.message).toBe("Adicionar movimentações é um recurso do plano Individual.")
    expect(copy.message).not.toContain("plan_required")
    expect(copy.action).toBe("Conhecer o plano")
    expect(copy.upgrade).toBe(true)
  })

  it("trata falha de rede como serviço indisponível", () => {
    expect(apiErrorCode(new TypeError("Failed to fetch"))).toBe("service_unavailable")
    expect(describeApiError(new TypeError("Failed to fetch")).message).not.toContain("fetch")
  })
})

describe("FinanceProvider — resposta 402 ao adicionar renda", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    window.CSRF_TOKEN = "token-de-teste"
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    delete window.CSRF_TOKEN
  })

  it("descarta a renda recusada, mostra mensagem amigável e oferece o plano", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes("data.php") && (!init || init.method !== "POST")) return jsonResponse(BOOTSTRAP)
      if (url.includes("finance.php")) {
        return jsonResponse({ ok: false, code: "plan_required", error: "plan_required", required_plan: "individual" }, 402)
      }
      return jsonResponse({ ok: true })
    })
    vi.stubGlobal("fetch", fetchMock)

    await mountRemote()
    expect(screen.getByTestId("income-count").textContent).toBe("0")

    await act(async () => { screen.getByText("add-income").click() })
    // A lista só publica dados confirmados; o rascunho permanece no formulário
    // chamador enquanto o servidor decide.
    expect(screen.getByTestId("income-count").textContent).toBe("0")

    await act(async () => { await vi.advanceTimersByTimeAsync(50) })

    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("error"))
    expect(screen.getByTestId("income-count").textContent).toBe("0")
    expect(screen.getByTestId("code").textContent).toBe("plan_required")
    expect(screen.getByTestId("upgrade").textContent).toBe("true")
    const message = screen.getByTestId("error").textContent ?? ""
    expect(message).toBe("Adicionar movimentações é um recurso do plano Individual.")
    expect(message).not.toContain("plan_required")
  })

  it("não reenvia a renda recusada em uma mutação posterior", async () => {
    const savedIncome: unknown[][] = []
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes("data.php") && (!init || init.method !== "POST")) return jsonResponse(BOOTSTRAP)
      if (url.includes("finance.php")) {
        const body = JSON.parse(String(init?.body ?? "{}")) as { sets?: { income_lines?: unknown[] } }
        if (body.sets?.income_lines) savedIncome.push(body.sets.income_lines)
        return jsonResponse({ ok: false, code: "plan_required", error: "plan_required" }, 402)
      }
      return jsonResponse({ ok: true })
    })
    vi.stubGlobal("fetch", fetchMock)

    await mountRemote()
    await act(async () => { screen.getByText("add-income").click() })
    await act(async () => { await vi.advanceTimersByTimeAsync(900) })
    await waitFor(() => expect(screen.getByTestId("income-count").textContent).toBe("0"))

    const attemptsBefore = savedIncome.length
    await act(async () => { screen.getByText("add-income").click() })
    await act(async () => { await vi.advanceTimersByTimeAsync(900) })

    // Cada tentativa envia somente a renda daquela tentativa, nunca a anterior acumulada.
    expect(savedIncome.length).toBe(attemptsBefore + 1)
    savedIncome.forEach((value) => expect(value.length).toBe(1))
  })

  it("mantém a renda quando o servidor confirma com 2xx", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes("data.php") && (!init || init.method !== "POST")) return jsonResponse(BOOTSTRAP)
      return jsonResponse({ ok: true })
    })
    vi.stubGlobal("fetch", fetchMock)

    await mountRemote()
    await act(async () => { screen.getByText("add-income").click() })
    await act(async () => { await vi.advanceTimersByTimeAsync(900) })

    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("synced"))
    expect(screen.getByTestId("income-count").textContent).toBe("1")
    expect(screen.getByTestId("error").textContent).toBe("")
    expect(screen.getByTestId("code").textContent).toBe("")
  })

  it("rebasa mutações sobrepostas no mesmo set e preserva estado auxiliar", async () => {
    const server: Record<string, unknown> = JSON.parse(JSON.stringify(BOOTSTRAP))
    const payloads: Array<{ sets?: Record<string, unknown[]> }> = []
    let releaseFirst: (() => void) | undefined
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = String(input)
      if (url.includes("data.php") && (!init || init.method !== "POST")) return Promise.resolve(jsonResponse(server))
      if (url.includes("data.php") && init?.method === "POST") {
        const body = JSON.parse(String(init.body ?? "{}")) as { key?: string; value?: unknown }
        if (body.key) server[body.key] = body.value
        return Promise.resolve(jsonResponse({ ok: true }))
      }
      if (url.includes("finance.php")) {
        const body = JSON.parse(String(init?.body ?? "{}")) as { sets?: Record<string, unknown[]> }
        payloads.push(body)
        const apply = () => Object.entries(body.sets ?? {}).forEach(([key, value]) => { server[key] = value })
        if (payloads.length === 1) {
          return new Promise((resolve) => {
            releaseFirst = () => { apply(); resolve(jsonResponse({ ok: true })) }
          })
        }
        apply()
      }
      return Promise.resolve(jsonResponse({ ok: true }))
    })
    vi.stubGlobal("fetch", fetchMock)

    await mountRemote()
    await act(async () => { screen.getByText("add-income").click() })
    await waitFor(() => expect(payloads).toHaveLength(1))
    await act(async () => {
      screen.getByText("add-income").click()
      screen.getByText("toggle-favorite").click()
      await vi.advanceTimersByTimeAsync(400)
    })

    expect(payloads).toHaveLength(1)
    expect(screen.getByTestId("income-count").textContent).toBe("0")
    expect(screen.getByTestId("favorite-count").textContent).toBe("1")
    await act(async () => { releaseFirst?.(); await Promise.resolve() })

    await waitFor(() => expect(payloads).toHaveLength(2))
    await waitFor(() => expect(screen.getByTestId("income-count").textContent).toBe("2"))
    expect(payloads[0].sets?.income_lines).toHaveLength(1)
    expect(payloads[1].sets?.income_lines).toHaveLength(2)
    expect(screen.getByTestId("favorite-count").textContent).toBe("1")

    await act(async () => { screen.getByText("refresh").click() })
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("synced"))
    expect(screen.getByTestId("income-count").textContent).toBe("2")
    expect(screen.getByTestId("favorite-count").textContent).toBe("1")
  })

  it("descarta a alteração e informa indisponibilidade em falha de rede", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes("data.php") && (!init || init.method !== "POST")) return jsonResponse(BOOTSTRAP)
      throw new TypeError("Failed to fetch")
    })
    vi.stubGlobal("fetch", fetchMock)

    await mountRemote()
    await act(async () => { screen.getByText("add-income").click() })
    await act(async () => { await vi.advanceTimersByTimeAsync(900) })

    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("error"))
    expect(screen.getByTestId("income-count").textContent).toBe("0")
    expect(screen.getByTestId("code").textContent).toBe("service_unavailable")
    expect(screen.getByTestId("upgrade").textContent).toBe("false")
  })
})
