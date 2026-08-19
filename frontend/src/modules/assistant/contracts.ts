export type AssistantStatus = "applied" | "answered" | "query" | "clarification" | "refused" | "undone" | "confirmation" | "cancelled" | "routed"
export interface AssistantUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCostUsd: number
}

export interface AssistantResponse {
  ok: boolean
  status: AssistantStatus
  action?: string
  message: string
  module?: "financeiro" | "agenda" | "treinos" | "alimentacao" | "query" | null
  undoAvailable: boolean
  actionToken?: string | null
  undoExpiresAt?: string | null
  confirmationRequired?: boolean
  confirmationExpiresAt?: string | null
  usage?: AssistantUsage
  data?: unknown
}

export interface AssistantHistoryExchange {
  requestId: string
  createdAt: string
  userText: string
  response: AssistantResponse
}

export interface AssistantInsight {
  id: string
  severity: "info" | "warning" | "danger"
  title: string
  message: string
  module: "financeiro" | "agenda" | "treinos" | "alimentacao"
  path: string
  source: "local_rules"
  asOf: string
}

export interface AssistantQualitySummary {
  days: number
  from: string
  totals: {
    requests: number; clarifications: number; refusals: number; confirmations: number
    confirmed: number; cancelled: number; undone: number; failures: number
    averageLatencyMs: number; tokens: number; estimatedCostUsd: number
  }
  items: Array<Record<string, string | number>>
}
