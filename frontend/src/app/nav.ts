/** Itens de navegação do shell autenticado. Fonte única para TopNavBar,
 *  BottomNav e as rotas em App.tsx — mantém rótulo/ícone/rota em sincronia.
 *  Rótulo "Rotina" aponta para a rota /agenda (contrato de rota preservado). */
export interface NavItem {
  to: string
  label: string
  icon: string
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Visão geral", icon: "grid_view" },
  { to: "/financeiro", label: "Finanças", icon: "account_balance" },
  { to: "/agenda", label: "Rotina", icon: "event" },
  { to: "/treinos", label: "Treinos", icon: "exercise" },
  { to: "/alimentacao", label: "Alimentação", icon: "restaurant" },
]
