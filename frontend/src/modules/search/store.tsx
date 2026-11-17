import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import { userStorageKey } from "../../lib/userStorage"

const RECENTS_KEY = "level-os:search-recents:v1"

function readRecents(): string[] {
  try {
    const value = JSON.parse(sessionStorage.getItem(userStorageKey(RECENTS_KEY)) ?? "[]")
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 6) : []
  } catch { return [] }
}

interface SearchContextValue {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  query: string
  setQuery: (query: string) => void
  recentQueries: string[]
  rememberQuery: (query: string) => void
  clearRecentQueries: () => void
}

const SearchContext = createContext<SearchContextValue | null>(null)

/**
 * Mantém a digitação da busca isolada do estado operacional do app. Assim,
 * cada tecla atualiza apenas a busca, sem renderizar novamente os dashboards.
 */
export function SearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [recentQueries, setRecentQueries] = useState(readRecents)
  const rememberQuery = useCallback((next: string) => {
    const clean = next.trim()
    if (clean.length < 2) return
    setRecentQueries((current) => {
      const updated = [clean, ...current.filter((item) => item.toLocaleLowerCase("pt-BR") !== clean.toLocaleLowerCase("pt-BR"))].slice(0, 6)
      try { sessionStorage.setItem(userStorageKey(RECENTS_KEY), JSON.stringify(updated)) } catch { /* Sem persistência, a busca continua funcional. */ }
      return updated
    })
  }, [])
  const clearRecentQueries = useCallback(() => {
    setRecentQueries([])
    try { sessionStorage.removeItem(userStorageKey(RECENTS_KEY)) } catch { /* noop */ }
  }, [])
  const value = useMemo(() => ({ isOpen, setIsOpen, query, setQuery, recentQueries, rememberQuery, clearRecentQueries }), [clearRecentQueries, isOpen, query, recentQueries, rememberQuery])

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
}

export function useSearch(): SearchContextValue {
  const value = useContext(SearchContext)
  if (!value) throw new Error("useSearch precisa estar dentro de SearchProvider")
  return value
}
