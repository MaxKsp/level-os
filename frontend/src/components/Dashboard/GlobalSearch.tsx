import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useApp } from "../../context/AppContext"
import { useFinance } from "../../modules/finance/store"
import { useTraining } from "../../modules/training/store"
import { Icon } from "../../design-system"
import { cn } from "../../lib/cn"

type Scope = "todos" | "financas" | "rotina" | "treinos"
interface SearchItem { id: string; scope: Exclude<Scope, "todos">; title: string; description: string; icon: string; to: string }

export function GlobalSearch() {
  const { isSearchOpen, setIsSearchOpen, searchQuery, setSearchQuery, tasks, exercises } = useApp()
  const fin = useFinance()
  const { workouts } = useTraining()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [scope, setScope] = useState<Scope>("todos")
  const [active, setActive] = useState(0)

  const all = useMemo<SearchItem[]>(() => [
    { id: "quick-fin", scope: "financas", title: "Finanças", description: "Contas, cartões e rendas", icon: "account_balance_wallet", to: "/financeiro" },
    { id: "quick-statement", scope: "financas", title: "Extrato unificado", description: "Entradas, saídas e OFX", icon: "receipt_long", to: "/financeiro?tab=extrato" },
    ...fin.accounts.map((item) => ({ id: `acc-${item.id}`, scope: "financas" as const, title: item.label, description: `${item.bank ?? "Conta"} · ${item.tipo}`, icon: item.tipo === "cartao" ? "credit_card" : "account_balance", to: "/financeiro" })),
    ...fin.expenses.map((item) => ({ id: `exp-${item.id}`, scope: "financas" as const, title: item.label, description: item.categoria ?? "Despesa", icon: "payments", to: "/financeiro?tab=extrato" })),
    ...fin.income.map((item) => ({ id: `inc-${item.id}`, scope: "financas" as const, title: item.label, description: "Renda", icon: "trending_up", to: "/financeiro" })),
    ...tasks.map((item) => ({ id: `task-${item.id}`, scope: "rotina" as const, title: item.title, description: `${item.time} · ${item.subtitle}`, icon: "task_alt", to: "/agenda" })),
    ...workouts.map((item) => ({ id: `workout-${item.id}`, scope: "treinos" as const, title: item.name, description: item.focus || "Treino personalizado", icon: "fitness_center", to: "/treinos" })),
    ...exercises.map((item) => ({ id: `exercise-${item.id}`, scope: "treinos" as const, title: item.name, description: item.sets, icon: "exercise", to: "/treinos" })),
    { id: "quick-profile", scope: "rotina", title: "Perfil e aparência", description: "Tema e preferências", icon: "manage_accounts", to: "/perfil" },
  ], [exercises, fin.accounts, fin.expenses, fin.income, tasks, workouts])

  const results = useMemo(() => {
    const needle = searchQuery.trim().toLocaleLowerCase("pt-BR")
    return all.filter((item) => (scope === "todos" || item.scope === scope) && (!needle || `${item.title} ${item.description}`.toLocaleLowerCase("pt-BR").includes(needle))).slice(0, 12)
  }, [all, scope, searchQuery])

  useEffect(() => setActive(0), [scope, searchQuery])
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const editable = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement
      if (event.key === "/" && !editable) { event.preventDefault(); setIsSearchOpen(true) }
      if (!isSearchOpen) return
      if (event.key === "Escape") setIsSearchOpen(false)
      if (event.key === "ArrowDown") { event.preventDefault(); setActive((value) => Math.min(results.length - 1, value + 1)) }
      if (event.key === "ArrowUp") { event.preventDefault(); setActive((value) => Math.max(0, value - 1)) }
      if (event.key === "Enter" && results[active]) { event.preventDefault(); navigate(results[active].to); setIsSearchOpen(false); setSearchQuery("") }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [active, isSearchOpen, navigate, results, setIsSearchOpen, setSearchQuery])

  const go = (item: SearchItem) => { navigate(item.to); setIsSearchOpen(false); setSearchQuery("") }
  return <AnimatePresence>{isSearchOpen ? <div className="fixed inset-0 z-[120] flex items-start justify-center p-4 pt-[12vh]">
    <motion.button aria-label="Fechar busca" className="fixed inset-0 bg-black/78" onClick={() => setIsSearchOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
    <motion.section role="dialog" aria-modal="true" aria-label="Busca global" initial={{ opacity: 0, y: reduceMotion ? 0 : -18, scale: reduceMotion ? 1 : .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -12, scale: reduceMotion ? 1 : .99 }} className="relative z-10 w-full max-w-2xl overflow-hidden rounded-xl border border-outline-variant bg-surface-container shadow-lg">
      <div className="flex items-center gap-3 border-b border-outline-variant px-4"><Icon name="search" className="text-[23px] text-primary" /><input autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Busque contas, despesas, tarefas ou treinos…" className="h-14 min-w-0 flex-1 bg-transparent text-base text-on-surface outline-none placeholder:text-muted" /><kbd className="rounded-md border border-outline-variant bg-surface-container-high px-2 py-1 text-[10px] text-muted">ESC</kbd></div>
      <div className="flex gap-5 overflow-x-auto border-b border-outline-variant px-4">{([['todos','Tudo'],['financas','Finanças'],['rotina','Rotina'],['treinos','Treinos']] as const).map(([key, label]) => <button key={key} onClick={() => setScope(key)} className={cn("whitespace-nowrap border-b-2 px-0 py-2.5 text-xs font-medium transition-colors", scope === key ? "border-primary text-primary" : "border-transparent text-muted hover:text-on-surface")}>{label}</button>)}</div>
      <div className="max-h-[52vh] overflow-y-auto">{results.length ? <ul className="divide-y divide-outline-variant">{results.map((item, index) => <li key={item.id}><button onMouseEnter={() => setActive(index)} onClick={() => go(item)} className={cn("flex w-full items-center gap-3 px-4 py-3 text-left transition-colors", active === index ? "bg-primary/[0.06]" : "hover:bg-surface-container-high") }><span className="grid h-8 w-8 place-items-center rounded-md border border-outline-variant text-primary"><Icon name={item.icon} className="text-[18px]" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-on-surface">{item.title}</span><span className="block truncate text-xs text-muted">{item.description}</span></span><span className="text-[10px] capitalize text-muted">{item.scope}</span><Icon name="arrow_forward" className="text-[16px] text-muted" /></button></li>)}</ul> : <div className="px-5 py-12 text-center"><Icon name="search_off" className="text-[28px] text-muted" /><p className="mt-2 text-sm text-muted">Nenhum resultado para “{searchQuery}”.</p></div>}</div>
      <footer className="flex items-center justify-between border-t border-outline-variant px-4 py-2 text-[10px] text-muted"><span>↑↓ navegar · Enter abrir</span><span>{results.length} resultados</span></footer>
    </motion.section>
  </div> : null}</AnimatePresence>
}
