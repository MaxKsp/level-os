import { NavLink } from "react-router-dom"
import { Icon } from "../../design-system"
import { cn } from "../../lib/cn"
import { NAV_ITEMS } from "../../app/nav"

/** Navegação inferior fixa no mobile (polegar). Escondida em >= md, onde a
 *  TopNavBar assume. Reusa NAV_ITEMS para ficar em sincronia com o topo. */
export const BottomNav = () => (
  <nav
    aria-label="Navegação principal"
    className="level-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-outline-variant bg-chrome md:hidden"
  >
    <ul className="mx-auto flex max-w-md items-stretch justify-around">
      {NAV_ITEMS.map((item) => (
        <li key={item.to} className="min-w-0 flex-1">
          <NavLink
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "group flex min-w-0 flex-col items-center gap-0.5 px-0.5 py-1.5 text-[10px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted",
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    "grid h-8 min-w-11 place-items-center rounded-xl transition-[color,background-color,transform] duration-200",
                    isActive
                      ? "bg-primary/13"
                      : "group-hover:bg-surface-container-high group-hover:text-on-surface",
                  )}
                >
                  <Icon name={item.icon} filled={isActive} className="text-[22px]" />
                </span>
                <span className="max-w-full truncate">{item.label}</span>
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  </nav>
)
