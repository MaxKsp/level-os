import type { AssistantModule } from "./store"

export interface AssistantPersona {
  /** Cargo exibido antes do nome. Ex.: "Assessor". */
  title: string
  name: string
  tagline: string
  greeting: string
}

/** Espelha as personas definidas no servidor (AssistantRouter::PERSONAS). */
export const PERSONAS: Record<AssistantModule, AssistantPersona> = {
  financeiro: {
    title: "Assessor",
    name: "Fin",
    tagline: "Lançamentos, contas e para onde seu dinheiro está indo.",
    greeting: "No que mexemos nas suas finanças?",
  },
  agenda: {
    title: "Secretária",
    name: "Nina",
    tagline: "Sua agenda, suas tarefas e o ritmo do seu dia.",
    greeting: "O que entra na sua rotina?",
  },
  treinos: {
    title: "Personal",
    name: "Léo",
    tagline: "Treinos sob medida, medidas corporais e sua evolução.",
    greeting: "Bora treinar. O que você precisa?",
  },
  alimentacao: {
    title: "Nutricionista",
    name: "Rita",
    tagline: "Assistente virtual de alimentação, receitas, cardápios e compras.",
    greeting: "Oi! Quer analisar seu cardápio, descobrir uma receita ou tirar uma dúvida sobre alimentação?",
  },
}

export const GENERAL_PERSONA: AssistantPersona = {
  title: "",
  name: "Agente de IA",
  tagline: "Finanças, rotina, treinos e alimentação em um só lugar.",
  greeting: "Como posso ajudar hoje?",
}

export function personaFor(module: AssistantModule | null): AssistantPersona {
  return module ? PERSONAS[module] : GENERAL_PERSONA
}

/** "Assessor Fin" — ou só o nome quando não há cargo (agente geral). */
export function personaFullName(persona: AssistantPersona): string {
  return persona.title ? `${persona.title} ${persona.name}` : persona.name
}
