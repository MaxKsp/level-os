import { PanelLeftClose, PanelLeftOpen, Search } from "lucide-react"
import { useLayoutEffect, useState } from "react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { NAV_ITEMS } from "../../app/nav"
import { useApp } from "../../context/AppContext"
import { Icon } from "../../design-system/Icon"
import { cn } from "../../lib/cn"
import { useAssistant } from "../../modules/assistant/store"
import { useIdentity } from "../../modules/identity/store"
import { LevelChip } from "../../modules/progress/components/LevelChip"
import { TrialChip } from "../../modules/subscription/TrialChip"
import { LevelMark } from "../ui/LevelMark"
import { AssistantAvatar } from "../../modules/assistant/AssistantAvatar"

const SIDEBAR_KEY = "level-os:sidebar-collapsed"

function storedSidebarState(): boolean {
  try { return window.localStorage.getItem(SIDEBAR_KEY) === "true" } catch { return false }
}

/** Shell responsivo: sidebar colapsável no desktop e barra compacta no mobile. */
export const TopNavBar = () => {
  const { setIsSearchOpen } = useApp()
  const { identity } = useIdentity()
  const assistant = useAssistant()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(storedSidebarState)
  const initials = identity.username.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "LV"
  const avatarUrl = identity.avatar ? (identity.avatar.startsWith("http") || identity.avatar.startsWith("/") ? identity.avatar : `/${identity.avatar}`) : null
  const profileActive = location.pathname === "/perfil"

  useLayoutEffect(() => {
    document.documentElement.dataset.sidebar = collapsed ? "collapsed" : "expanded"
    try { window.localStorage.setItem(SIDEBAR_KEY, String(collapsed)) } catch { /* A navegação continua funcional sem storage. */ }
    return () => { delete document.documentElement.dataset.sidebar }
  }, [collapsed])

  const toggleSidebar = () => setCollapsed((current) => !current)
  const avatar = (size: string) => <span className={cn("grid shrink-0 place-items-center overflow-hidden rounded-full bg-surface-container-high text-sm font-semibold text-primary", size)}>{avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initials}</span>

  return (
    <>
      <header className="level-topbar fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-outline-variant bg-chrome px-4 md:hidden">
        <button type="button" onClick={() => navigate("/")} className="flex min-h-11 items-center gap-2.5 rounded-md px-1 text-on-surface" aria-label="Ir para o início">
          <LevelMark className="h-8 w-8 text-primary" />
          <span className="text-xs font-semibold tracking-[0.16em]">LEVEL OS</span>
        </button>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Abrir perfil" onClick={() => navigate("/perfil")} className={cn("level-avatar-button grid size-11 place-items-center rounded-md", profileActive && "bg-primary/10 ring-1 ring-primary/35")}>{avatar("size-8")}</button>
          <button type="button" aria-label="Abrir busca global" onClick={() => setIsSearchOpen(true)} className="grid size-11 place-items-center rounded-md text-muted hover:bg-surface-container-high hover:text-on-surface"><Search className="size-4" aria-hidden="true" /></button>
          <button type="button" aria-label="Agente de IA" onClick={() => assistant.setOpen(true)} className="grid size-11 place-items-center rounded-md border border-primary/25 bg-primary/[0.07] text-primary"><AssistantAvatar className="size-4" /></button>
        </div>
      </header>

      <aside className={cn("level-sidebar fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-outline-variant bg-chrome py-5 transition-[width,padding] duration-200 motion-reduce:transition-none md:flex", collapsed ? "w-20 px-3" : "w-64 px-4")} aria-label="Barra lateral">
        <button type="button" onClick={() => navigate("/")} className={cn("flex min-h-12 items-center rounded-md text-on-surface", collapsed ? "justify-center" : "gap-3 px-2")} aria-label="Ir para o início" title={collapsed ? "Level OS" : undefined}>
          <LevelMark className="h-9 w-9 shrink-0 text-primary" />
          {!collapsed ? <span className="text-sm font-semibold tracking-[0.18em]">LEVEL OS</span> : null}
        </button>
        <button type="button" aria-expanded={!collapsed} aria-label={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"} title={collapsed ? "Expandir" : "Recolher"} onClick={toggleSidebar} className={cn("mt-2 flex size-11 shrink-0 items-center justify-center self-end rounded-md text-muted transition-colors hover:bg-surface-container-high hover:text-on-surface", collapsed && "self-center")}>
          {collapsed ? <PanelLeftOpen className="size-4" aria-hidden="true" /> : <PanelLeftClose className="size-4" aria-hidden="true" />}
        </button>

        <nav className="mt-4" aria-label="Navegação principal">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === "/"}
                  title={collapsed ? item.label : undefined}
                  aria-label={collapsed ? item.label : undefined}
                  className={({ isActive }) => cn("flex min-h-11 items-center rounded-md border-l-2 text-sm transition-colors", collapsed ? "justify-center px-0" : "gap-3 px-3", isActive ? "border-primary bg-primary/[0.09] font-semibold text-on-surface" : "border-transparent font-medium text-muted hover:bg-surface-container-high hover:text-on-surface")}
                >
                  {({ isActive }) => <><Icon name={item.icon} filled={isActive} className={cn("shrink-0 text-[20px]", isActive && "text-primary")} />{!collapsed ? <span>{item.label}</span> : null}</>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-auto space-y-2 border-t border-outline-variant pt-4">
          {!collapsed ? <><TrialChip /><LevelChip /></> : null}
          <button type="button" aria-label="Agente de IA" title={collapsed ? "Agente de IA" : undefined} onClick={() => assistant.setOpen(true)} className={cn("flex min-h-11 w-full items-center rounded-md border-l-2 border-transparent text-left text-sm font-medium text-muted transition-colors hover:bg-primary/[0.07] hover:text-on-surface", collapsed ? "justify-center px-0" : "gap-3 px-3")}>
            <AssistantAvatar className="size-5 shrink-0 text-primary" />
            {!collapsed ? <><span>Agente de IA</span><kbd className="ml-auto text-[10px] text-muted">Ctrl K</kbd></> : null}
          </button>
          <button type="button" aria-label="Buscar" title={collapsed ? "Buscar" : undefined} onClick={() => setIsSearchOpen(true)} className={cn("flex min-h-11 w-full items-center rounded-md border-l-2 border-transparent text-left text-sm font-medium text-muted transition-colors hover:bg-surface-container-high hover:text-on-surface", collapsed ? "justify-center px-0" : "gap-3 px-3")}>
            <Search className="size-5 shrink-0" aria-hidden="true" />
            {!collapsed ? <><span>Buscar</span><kbd className="ml-auto text-[10px] text-muted">/</kbd></> : null}
          </button>
          <button type="button" onClick={() => navigate("/perfil")} aria-label="Abrir perfil" title={collapsed ? "Perfil" : undefined} className={cn("level-avatar-button flex min-h-12 w-full items-center rounded-md text-left transition-colors hover:bg-surface-container-high", collapsed ? "justify-center" : "gap-3 px-2", profileActive && "bg-primary/[0.09] ring-1 ring-inset ring-primary/25")}>
            {avatar("size-10")}
            {!collapsed ? <div className="min-w-0"><p className="truncate text-sm font-medium text-on-surface">{identity.username}</p><p className="truncate text-xs text-muted">{identity.email || "Perfil local"}</p></div> : null}
          </button>
        </div>
      </aside>
    </>
  )
}
