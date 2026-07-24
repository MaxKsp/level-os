export type AssistantStatus = "applied" | "answered" | "query" | "clarification" | "refused" | "undone" | "confirmation" | "cancelled"
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
