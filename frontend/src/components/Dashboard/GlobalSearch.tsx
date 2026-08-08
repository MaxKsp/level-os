import { useDeferredValue, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useApp } from "../../context/AppContext"
import { EmptyState, Icon } from "../../design-system"
import { cn } from "../../lib/cn"
import { useFinance } from "../../modules/finance/store"
import { useNutrition } from "../../modules/nutrition/store"
import { useSearch } from "../../modules/search/store"
import { useTraining } from "../../modules/training/store"
import { CATEGORY_LABEL } from "../../modules/finance/categories"

type SearchScope = "todos" | "financas" | "rotina" | "treinos" | "alimentacao"
type ItemScope = Exclude<SearchScope, "todos"> | "perfil"

interface SearchItem {
  id: string
  scope: ItemScope
  title: string
  description: string
  icon: string
  to: string
}

const FILTERS: ReadonlyArray<readonly [SearchScope, string]> = [
  ["todos", "Tudo"],
  ["financas", "Finanças"],
  ["rotina", "Rotina"],
  ["treinos", "Treinos"],
  ["alimentacao", "Alimentação"],
]

const SCOPE_LABEL: Record<ItemScope, string> = {
  financas: "Finanças",
  rotina: "Rotina",
  treinos: "Treinos",
  alimentacao: "Alimentação",
  perfil: "Perfil",
}

export function GlobalSearch() {
  const appActions = useApp()
  const { tasks, exercises } = appActions
  const {
    isOpen: isSearchOpen,
    setIsOpen: setIsSearchOpen,
    query: searchQuery,
    setQuery: setSearchQuery,
    recentQueries,
    rememberQuery,
    clearRecentQueries,
  } = useSearch()
  const fin = useFinance()
  const nutrition = useNutrition()
  const { workouts } = useTraining()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [scope, setScope] = useState<SearchScope>("todos")
  const [active, setActive] = useState(0)
  const deferredQuery = useDeferredValue(searchQuery)

  const all = useMemo<SearchItem[]>(() => {
    const planItems: SearchItem[] = nutrition.plan
      ? [
          {
            id: "nutrition-active-plan",
            scope: "alimentacao",
            title: "Plano alimentar ativo",
            description: `${nutrition.plan.periodDays} dias · ${nutrition.plan.goal}`,
            icon: "restaurant_menu",
            to: "/alimentacao#nutrition-plan",
          },
          ...(nutrition.plan.shoppingList?.length
            ? [{
                id: "nutrition-shopping-list",
                scope: "alimentacao" as const,
                title: "Lista de compras",
                description: `${nutrition.plan.shoppingList.length} itens organizados`,
                icon: "shopping_cart",
                to: "/alimentacao#shopping-list",
              }]
            : []),
        ]
      : [{
          id: "nutrition-start",
          scope: "alimentacao",
          title: "Criar plano alimentar",
          description: "Cardápio, orçamento e lista de compras",
          icon: "restaurant",
          to: "/alimentacao",
        }]

    return [
      { id: "quick-fin", scope: "financas", title: "Finanças", description: "Contas, cartões e rendas", icon: "account_balance_wallet", to: "/financeiro" },
      { id: "quick-statement", scope: "financas", title: "Extrato unificado", description: "Entradas, saídas e OFX", icon: "receipt_long", to: "/financeiro?tab=extrato" },
      ...fin.accounts.map((item) => ({ id: `acc-${item.id}`, scope: "financas" as const, title: item.label, description: `${item.bank ?? "Conta"} · ${item.tipo}`, icon: item.tipo === "cartao" ? "credit_card" : "account_balance", to: "/financeiro" })),
      ...fin.expenses.map((item) => ({ id: `exp-${item.id}`, scope: "financas" as const, title: item.label, description: item.categoria ? (CATEGORY_LABEL[item.categoria] ?? item.categoria) : "Despesa", icon: "payments", to: "/financeiro?tab=extrato" })),
      ...fin.income.map((item) => ({ id: `inc-${item.id}`, scope: "financas" as const, title: item.label, description: "Renda", icon: "trending_up", to: "/financeiro" })),
      ...tasks.map((item) => ({ id: `task-${item.id}`, scope: "rotina" as const, title: item.title, description: `${item.time} · ${item.subtitle}`, icon: "task_alt", to: "/agenda" })),
      ...workouts.map((item) => ({ id: `workout-${item.id}`, scope: "treinos" as const, title: item.name, description: item.focus || "Treino personalizado", icon: "fitness_center", to: "/treinos" })),
      ...exercises.map((item) => ({ id: `exercise-${item.id}`, scope: "treinos" as const, title: item.name, description: item.sets, icon: "exercise", to: "/treinos" })),
      ...planItems,
      { id: "quick-profile", scope: "perfil", title: "Perfil e preferências", description: "Conta, tema e segurança", icon: "manage_accounts", to: "/perfil" },
    ]
  }, [exercises, fin.accounts, fin.expenses, fin.income, nutrition.plan, tasks, workouts])

  const results = useMemo(() => {
    const needle = deferredQuery.trim().toLocaleLowerCase("pt-BR")
    return all
      .filter((item) => (scope === "todos" || item.scope === scope)
        && (!needle || `${item.title} ${item.description}`.toLocaleLowerCase("pt-BR").includes(needle)))
      .slice(0, 14)
  }, [all, scope, deferredQuery])

  useEffect(() => setActive(0), [scope, searchQuery])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!isSearchOpen) return
      if (event.key === "Escape") setIsSearchOpen(false)
      if (event.key === "ArrowDown") {
        event.preventDefault()
        setActive((value) => Math.min(results.length - 1, value + 1))
      }
      if (event.key === "ArrowUp") {
        event.preventDefault()
        setActive((value) => Math.max(0, value - 1))
      }
      if (event.key === "Enter" && results[active]) {
        event.preventDefault()
        rememberQuery(searchQuery || results[active].title)
        navigate(results[active].to)
        setIsSearchOpen(false)
        setSearchQuery("")
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [active, isSearchOpen, navigate, rememberQuery, results, searchQuery, setIsSearchOpen, setSearchQuery])

  const go = (item: SearchItem) => {
    rememberQuery(searchQuery || item.title)
    navigate(item.to)
    setIsSearchOpen(false)
    setSearchQuery("")
  }

  const quickAction = (action: "expense" | "task" | "workout") => {
    setIsSearchOpen(false)
    setSearchQuery("")
    window.setTimeout(() => {
      if (action === "expense") appActions.setIsExpenseModalOpen(true)
      if (action === "task") appActions.setIsTaskModalOpen(true)
      if (action === "workout") appActions.setIsWorkoutModalOpen(true)
    }, 0)
  }

  const activeId = results[active] ? `global-search-${results[active].id}` : undefined

  return (
    <AnimatePresence>
      {isSearchOpen ? (
        <div className="fixed inset-0 z-[120] flex items-start justify-center sm:p-4 sm:pt-[10vh]">
          <motion.button
            type="button"
            aria-label="Fechar busca"
            className="fixed inset-0 bg-black/78"
            onClick={() => setIsSearchOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label="Busca global"
            initial={{ opacity: 0, y: reduceMotion ? 0 : -18, scale: reduceMotion ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -12, scale: reduceMotion ? 1 : 0.99 }}
            className="relative z-10 flex h-[100dvh] w-full flex-col overflow-hidden bg-surface-container shadow-lg sm:h-auto sm:max-h-[80vh] sm:max-w-2xl sm:rounded-xl sm:border sm:border-outline-variant"
          >
            <div className="flex items-center gap-3 border-b border-outline-variant px-4 pt-[env(safe-area-inset-top)] sm:pt-0">
              <Icon name="search" className="text-[23px] text-primary" />
              <input
                autoFocus
                role="combobox"
                aria-label="Buscar no Level OS"
                aria-controls="global-search-results"
                aria-expanded="true"
                aria-activedescendant={activeId}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Busque contas, despesas, tarefas, treinos ou refeições…"
                className="h-14 min-w-0 flex-1 bg-transparent text-base text-on-surface outline-none placeholder:text-muted"
              />
              <button type="button" onClick={() => setIsSearchOpen(false)} className="level-icon-button grid size-11 place-items-center rounded-lg text-muted hover:bg-surface-container-high hover:text-on-surface" aria-label="Fechar busca">
                <Icon name="close" className="text-[19px]" />
              </button>
            </div>
            <div className="flex shrink-0 gap-5 overflow-x-auto border-b border-outline-variant px-4" aria-label="Filtrar busca">
              {FILTERS.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={scope === key}
                  onClick={() => setScope(key)}
                  className={cn("relative min-h-11 whitespace-nowrap border-b-2 px-0 text-xs font-medium transition-colors", scope === key ? "border-primary text-primary" : "border-transparent text-muted hover:text-on-surface")}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="border-b border-outline-variant px-4 py-3">
              <p className="mb-2 text-[11px] font-medium text-muted">Ações rápidas</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => quickAction("expense")} className="level-row-action flex min-h-10 items-center gap-2 rounded-lg border border-outline-variant px-3 text-xs font-medium text-on-surface hover:bg-surface-container-high"><Icon name="payments" className="text-[16px] text-primary" />Adicionar despesa</button>
                <button type="button" onClick={() => quickAction("task")} className="level-row-action flex min-h-10 items-center gap-2 rounded-lg border border-outline-variant px-3 text-xs font-medium text-on-surface hover:bg-surface-container-high"><Icon name="alarm_add" className="text-[16px] text-primary" />Criar tarefa</button>
                <button type="button" onClick={() => quickAction("workout")} className="level-row-action flex min-h-10 items-center gap-2 rounded-lg border border-outline-variant px-3 text-xs font-medium text-on-surface hover:bg-surface-container-high"><Icon name="fitness_center" className="text-[16px] text-primary" />Registrar treino</button>
              </div>
              {!searchQuery && recentQueries.length ? <div className="mt-3 flex items-center gap-2 overflow-x-auto"><span className="shrink-0 text-[11px] text-muted">Recentes</span>{recentQueries.map((query) => <button key={query} type="button" onClick={() => setSearchQuery(query)} className="min-h-8 shrink-0 rounded-full bg-surface-container-high px-3 text-xs text-on-surface hover:bg-primary/10">{query}</button>)}<button type="button" onClick={clearRecentQueries} className="min-h-8 shrink-0 px-2 text-xs text-muted hover:text-on-surface">Limpar</button></div> : null}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {results.length ? (
                <ul id="global-search-results" role="listbox" className="divide-y divide-outline-variant">
                  {results.map((item, index) => (
                    <li key={item.id} role="presentation">
                      {index === 0 || results[index - 1]?.scope !== item.scope ? <div className="border-b border-outline-variant bg-surface-container-low px-4 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted">{SCOPE_LABEL[item.scope]}</div> : null}
                      <button
                        id={`global-search-${item.id}`}
                        type="button"
                        role="option"
                        aria-selected={active === index}
                        onMouseEnter={() => setActive(index)}
                        onFocus={() => setActive(index)}
                        onClick={() => go(item)}
                        className={cn("level-row-action flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors", active === index ? "bg-primary/[0.06]" : "hover:bg-surface-container-high")}
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-outline-variant bg-surface-container-low text-primary"><Icon name={item.icon} className="text-[18px]" /></span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-on-surface">{item.title}</span><span className="block truncate text-xs text-muted">{item.description}</span></span>
                        <span className="hidden text-[10px] text-muted sm:block">{SCOPE_LABEL[item.scope]}</span>
                        <Icon name="arrow_forward" className="text-[16px] text-muted" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="Nada encontrado" description={`Não encontramos resultados para “${searchQuery}”. Tente outro termo ou filtro.`} icon="search_off" />
              )}
            </div>
            <footer className="hidden shrink-0 items-center justify-between border-t border-outline-variant px-4 py-2 text-[10px] text-muted sm:flex"><span>↑↓ navegar · Enter abrir</span><span>{results.length} resultados</span></footer>
          </motion.section>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
