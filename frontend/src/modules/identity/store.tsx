import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { hasIdentityBackend, loadIdentity, uploadAvatar as uploadAvatarRequest } from "./api"
import { PREVIEW_IDENTITY, type Identity } from "./contracts"

interface IdentityContextValue {
  identity: Identity
  status: "loading" | "ready" | "error"
  error: string | null
  refresh: () => Promise<void>
  uploadAvatar: (file: File) => Promise<void>
}

const IdentityContext = createContext<IdentityContextValue | null>(null)

export function IdentityProvider({ children }: { children: ReactNode }) {
  const remote = hasIdentityBackend()
  const [identity, setIdentity] = useState<Identity>(() => remote ? { ...PREVIEW_IDENTITY, username: "" } : PREVIEW_IDENTITY)
  const [status, setStatus] = useState<IdentityContextValue["status"]>(remote ? "loading" : "ready")
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!hasIdentityBackend()) return
    try {
      setIdentity(await loadIdentity())
      setStatus("ready")
      setError(null)
    } catch (cause) {
      setStatus("error")
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar o perfil.")
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const uploadAvatar = useCallback(async (file: File) => {
    if (!hasIdentityBackend()) throw new Error("O upload exige o backend PHP autenticado.")
    const avatar = await uploadAvatarRequest(file)
    setIdentity((current) => ({ ...current, avatar }))
  }, [])

  const value = useMemo(() => ({ identity, status, error, refresh, uploadAvatar }), [identity, status, error, refresh, uploadAvatar])
  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>
}

export function useIdentity(): IdentityContextValue {
  const value = useContext(IdentityContext)
  if (!value) throw new Error("useIdentity deve ser usado dentro de IdentityProvider")
  return value
}
