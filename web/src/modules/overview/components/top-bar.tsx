import { Icon } from "@/design-system"

const MODULES = [
  { id: "overview", label: "Visão geral", active: true },
  { id: "finance", label: "Finanças", active: false },
  { id: "routine", label: "Rotina", active: false },
  { id: "training", label: "Treino", active: false },
]

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-outline-variant bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-on-primary">
            <Icon name="orbit" className="text-[20px]" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-on-surface">
            Orby
          </span>
        </div>

        <nav
          aria-label="Módulos"
          className="hidden items-center gap-1 rounded-xl border border-outline-variant bg-surface-container-low p-1 md:flex"
        >
          {MODULES.map((m) => (
            <a
              key={m.id}
              href={`#${m.id}`}
              aria-current={m.active ? "page" : undefined}
              className={
                m.active
                  ? "rounded-lg bg-surface-container-high px-3.5 py-1.5 text-sm font-medium text-on-surface"
                  : "rounded-lg px-3.5 py-1.5 text-sm font-medium text-on-surface-variant hover:text-on-surface"
              }
            >
              {m.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Buscar"
            className="grid h-10 w-10 place-items-center rounded-xl text-on-surface-variant hover:bg-white/5 hover:text-on-surface"
          >
            <Icon name="search" className="text-[20px]" />
          </button>
          <button
            type="button"
            aria-label="Perfil"
            className="grid h-9 w-9 place-items-center rounded-full bg-surface-container-high text-sm font-semibold text-on-surface"
          >
            L
          </button>
        </div>
      </div>
    </header>
  )
}
