import { describe, expect, it } from "vitest"
import { financeControl } from "./financeControl"
import { financeBootstrapMock } from "./mock"

describe("financeControl", () => {
  it("apresenta apenas pendências de vínculo verificáveis, não pagamentos presumidos", () => {
    const sample = financeBootstrapMock.expense_lines_v4[0]
    const data = { ...financeBootstrapMock, expense_lines_v4: [
      { ...sample, id: "linked", date: "2026-09-28", value: 18, accountId: "acc-principal", recorrencia: "none" as const },
      { ...sample, id: "unlinked", date: "2026-09-27", value: 20, accountId: null, recorrencia: "none" as const },
    ] }
    const control = financeControl(data, "2026-09-29")
    expect(control.unlinked.map((item) => item.id)).toEqual(["unlinked"])
    expect(control.heatmap.find((day) => day.date === "2026-09-27")).toMatchObject({ count: 1, amount: 20 })
    expect(control.heatmap).toHaveLength(28)
  })
  it("ajusta dia de vencimento 31 para fevereiro sem afirmar pagamento", () => {
    const sample = financeBootstrapMock.accounts_v2.find((account) => account.tipo === "cartao")!
    const data = { ...financeBootstrapMock, accounts_v2: [{ ...sample, vencimento: 31, fatura: 100 }],
      expense_lines_v4: [], income_lines: [], "ifood-entries": [], vaults: [], transfers: [] }
    const control = financeControl(data, "2027-02-24")
    expect(control.dueCards[0]?.date).toBe("2027-02-28")
  })
})
