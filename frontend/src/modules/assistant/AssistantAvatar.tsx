import { cn } from "../../lib/cn"
import type { AssistantModule } from "./store"

/**
 * Robô do agente com um acessório por persona: terno (Fin), headset (Nina),
 * faixa de treino (Léo) e folha de alimentação (Rita). Traço em currentColor
 * para herdar a cor de quem usa, igual aos ícones do lucide.
 */
export function AssistantAvatar({ module, className }: { module?: AssistantModule | null; className?: string }) {
  const nutrition = module === "alimentacao"
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-4", className)}
      aria-hidden="true"
    >
      {/* Antena: some quando há folha ou headset por cima. */}
      {!nutrition && module !== "agenda" ? (
        <>
          <path d="M12 6.5V4" />
          <circle cx="12" cy="2.9" r="1.1" />
        </>
      ) : null}

      {/* Cabeça e rosto */}
      <rect x="4" y="6.5" width="16" height="10" rx="3.2" />
      <circle cx="9.2" cy="11.2" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="11.2" r="1.15" fill="currentColor" stroke="none" />
      <path d="M2.2 11.2h1.6M20.2 11.2h1.6" />

      {/* Ombros */}
      <path d="M6 21.5v-1.2A3.3 3.3 0 0 1 9.3 17h5.4a3.3 3.3 0 0 1 3.3 3.3v1.2" />

      {module === "financeiro" ? (
        <>
          {/* Lapelas e gravata */}
          <path d="M10.2 17.2 12 19.2l1.8-2" />
          <path d="M12 19.2 11.1 20l.9 1.5.9-1.5z" fill="currentColor" />
        </>
      ) : null}

      {module === "agenda" ? (
        <>
          {/* Headset: arco, conchas e microfone */}
          <path d="M5.6 8.2a6.4 6.4 0 0 1 12.8 0" />
          <rect x="3.1" y="8" width="2.6" height="4" rx="1.1" />
          <rect x="18.3" y="8" width="2.6" height="4" rx="1.1" />
          <path d="M18.3 12v1.6a2 2 0 0 1-2 2h-1.1" />
        </>
      ) : null}

      {module === "treinos" ? (
        // Faixa de treino na testa
        <path d="M4.3 9.4h15.4" strokeWidth={2.2} />
      ) : null}

      {nutrition ? (
        <>
          {/* Folha: identidade de alimentação e bem-estar, sem jaleco clínico. */}
          <path d="M11 6C9 4 10 1.6 15.6 1.5c1 3.1-.7 5.2-4.6 4.5Z" />
          <path d="M11 6 14.5 3.1M12 6.5v-1" />
          <path d="M10 17.2 12 19l2-1.8" />
        </>
      ) : null}
    </svg>
  )
}
