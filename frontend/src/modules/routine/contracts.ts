/**
 * Modelos de domínio da Rotina.
 *
 * ATENÇÃO: estes NÃO são contratos de backend. Os contratos públicos
 * documentados cobrem apenas o Financeiro. Estes tipos reproduzem os view
 * models já usados no frontend existente (frontend/src/context/AppContext.tsx)
 * e servem para o preview até que exista um contrato de backend definido.
 */

export interface Task {
  id: string
  time: string
  title: string
  subtitle: string
  completed: boolean
}
