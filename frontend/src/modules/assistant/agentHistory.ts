import type { AssistantModule } from "./store"

export type AgentHistoryKey = AssistantModule | "geral"

export function agentHistoryKey(module: AssistantModule | null): AgentHistoryKey {
  return module ?? "geral"
}

export function createEmptyAgentHistory<T>(): Record<AgentHistoryKey, T[]> {
  return { geral: [], financeiro: [], agenda: [], treinos: [], alimentacao: [] }
}

export function appendAgentHistory<T>(
  history: Record<AgentHistoryKey, T[]>,
  key: AgentHistoryKey,
  item: T,
): Record<AgentHistoryKey, T[]> {
  return { ...history, [key]: [...history[key], item] }
}
