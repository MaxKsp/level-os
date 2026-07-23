import { describe, expect, it } from "vitest"
import { agentHistoryKey, appendAgentHistory, createEmptyAgentHistory } from "../modules/assistant/agentHistory"
import { assistantResultPresentation } from "../modules/assistant/AssistantResultCard"

describe("histórico isolado dos agentes", () => {
  it("mantém cada conversa somente no agente de origem", () => {
    const empty = createEmptyAgentHistory<string>()
    const finance = appendAgentHistory(empty, "financeiro", "despesa criada")
    const training = appendAgentHistory(finance, "treinos", "treino criado")

    expect(training.financeiro).toEqual(["despesa criada"])
    expect(training.treinos).toEqual(["treino criado"])
    expect(training.agenda).toEqual([])
    expect(training.alimentacao).toEqual([])
    expect(training.geral).toEqual([])
    expect(empty.financeiro).toEqual([])
    expect(agentHistoryKey(null)).toBe("geral")
  })
})

describe("entrega estruturada dos agentes", () => {
  it("confirma uma despesa com valor, conta, categoria e destino", () => {
    const result = assistantResultPresentation({
      ok: true, status: "applied", action: "add_expense", message: "Despesa registrada.",
      module: "financeiro", undoAvailable: true,
      data: { value: 42.9, description: "Mercado", category: "alimentação", account: "Nubank", date: "2026-07-21" },
    })
    expect(result?.destination).toBe("financeiro")
    expect(result?.details).toEqual(expect.arrayContaining([
      { label: "Valor", value: "R$ 42,90" },
      { label: "Conta", value: "Nubank" },
      { label: "Categoria", value: "alimentação" },
      { label: "Data", value: "21/07/2026" },
    ]))
  })

  it("resume programa de treino sem misturar com outro módulo", () => {
    const result = assistantResultPresentation({
      ok: true, status: "applied", action: "create_workout_program", message: "Programa criado.",
      module: "treinos", undoAvailable: true,
      data: { daysPerWeek: 3, location: "academia", workouts: [{}, {}, {}] },
    })
    expect(result).toMatchObject({
      destination: "treinos",
      destinationLabel: "Ver programa",
      details: expect.arrayContaining([
        { label: "Fichas", value: "3" },
        { label: "Frequência", value: "3x por semana" },
        { label: "Local", value: "academia" },
      ]),
    })
  })
})
