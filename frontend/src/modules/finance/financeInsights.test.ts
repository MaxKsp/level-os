import { describe, expect, it } from "vitest"
import type { ExpenseLineV4, FinanceBootstrap } from "./contracts"
import { financeInsights } from "./financeInsights"

const empty: FinanceBootstrap = {
  accounts_v2: [],
  expense_lines_v4: [],
  income_lines: [],
  "ifood-entries": [],
  vaults: [],
  transfers: [],
  acc_view: "conta",
  bank_favorites: [],
}

function expense(over: Partial<ExpenseLineV4>): ExpenseLineV4 {
  return { id: "e", label: "Despesa", value: 100, date: "2026-07-05", time: null, recorrencia: null, categoria: "mercado", method: null, bank: null, accountId: null, parcelas: null, createdAt: null, ...over }
}

const now = new Date(2026, 6, 20) // 20/07/2026

describe("financeInsights", () => {
  it("detecta pico de categoria acima da média dos 3 meses", () => {
    const data: FinanceBootstrap = {
      ...empty,
      expense_lines_v4: [
        expense({ id: "a", categoria: "lazer", value: 100, date: "2026-04-10" }),
        expense({ id: "b", categoria: "lazer", value: 100, date: "2026-05-10" }),
        expense({ id: "c", categoria: "lazer", value: 100, date: "2026-06-10" }),
        expense({ id: "d", categoria: "lazer", value: 300, date: "2026-07-10" }), // 200% acima da média (100)
      ],
    }
    const spike = financeInsights(data, now).find((i) => i.id === "spike")
    expect(spike).toBeTruthy()
    expect(spike!.tone).toBe("warning")
    expect(spike!.detail).toContain("200%")
  })

  it("não alerta quando o gasto está na média", () => {
    const data: FinanceBootstrap = {
      ...empty,
      expense_lines_v4: [
        expense({ id: "a", categoria: "lazer", value: 100, date: "2026-05-10" }),
        expense({ id: "b", categoria: "lazer", value: 100, date: "2026-06-10" }),
        expense({ id: "c", categoria: "lazer", value: 110, date: "2026-07-10" }),
      ],
    }
    expect(financeInsights(data, now).find((i) => i.id === "spike")).toBeUndefined()
  })

  it("aponta o maior gasto do mês e soma as assinaturas", () => {
    const data: FinanceBootstrap = {
      ...empty,
      expense_lines_v4: [
        expense({ id: "big", label: "Notebook", categoria: "eletronicos", value: 4000, date: "2026-07-03" }),
        expense({ id: "s1", label: "Netflix", categoria: "assinaturas", recorrencia: "mensal", value: 55, date: "2026-07-01" }),
        expense({ id: "s2", label: "Spotify", categoria: "assinaturas", recorrencia: "mensal", value: 22, date: "2026-07-01" }),
      ],
    }
    const insights = financeInsights(data, now)
    const biggest = insights.find((i) => i.id === "biggest")
    const subs = insights.find((i) => i.id === "subs")
    expect(biggest!.detail).toContain("Notebook")
    expect(subs!.title).toContain("2 assinatura")
    expect(subs!.detail).toContain("Netflix")
  })
})
