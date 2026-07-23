import { createContext, useContext, useMemo, useState, type ReactNode } from "react"

interface SearchContextValue {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  query: string
  setQuery: (query: string) => void
}

const SearchContext = createContext<SearchContextValue | null>(null)

/**
 * Mantém a digitação da busca isolada do estado operacional do app. Assim,
 * cada tecla atualiza apenas a busca, sem renderizar novamente os dashboards.
 */
export function SearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const value = useMemo(() => ({ isOpen, setIsOpen, query, setQuery }), [isOpen, query])

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
}

export function useSearch(): SearchContextValue {
  const value = useContext(SearchContext)
  if (!value) throw new Error("useSearch precisa estar dentro de SearchProvider")
  return value
}
