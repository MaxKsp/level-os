import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { applyTheme, getStoredTheme, type ThemeMode } from "../../lib/theme"
import { loadPreferences, savePreferences, type NotificationPreferences, type Preferences } from "./api"
import { userStorageKey } from "../../lib/userStorage"

const NOTIFICATIONS_KEY = "level-os:notifications:v1"
const ONBOARDING_KEY = "level-os:onboarding-completed"

function localNotifications(): NotificationPreferences {
  try {
    return { tasks: true, finance: true, backup: false, ...JSON.parse(localStorage.getItem(userStorageKey(NOTIFICATIONS_KEY)) ?? "{}") }
  } catch {
    return { tasks: true, finance: true, backup: false }
  }
}

function localPreferences(): Preferences {
  return {
    theme: getStoredTheme(),
    notifications: localNotifications(),
    notify_email: false,
    onboarding_completed: localStorage.getItem(userStorageKey(ONBOARDING_KEY)) === "true",
  }
}

interface PreferencesContextValue extends Preferences {
  status: "loading" | "ready" | "saving" | "error"
  error: string | null
  setAppearance: (theme: ThemeMode) => void
  toggleNotification: (key: keyof NotificationPreferences) => void
  setNotifyEmail: (enabled: boolean) => void
  completeOnboarding: () => void
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const backend = typeof window !== "undefined" && Boolean(window.CSRF_TOKEN)
  const [preferences, setPreferences] = useState<Preferences>(localPreferences)
  const [status, setStatus] = useState<PreferencesContextValue["status"]>(backend ? "loading" : "ready")
  const [error, setError] = useState<string | null>(null)
  const hydrated = useRef(false)

  useEffect(() => {
    if (!backend) { hydrated.current = true; return }
    let active = true
    loadPreferences().then((remote) => {
      if (!active) return
      setPreferences(remote)
      applyTheme(remote.theme)
      localStorage.setItem(userStorageKey(NOTIFICATIONS_KEY), JSON.stringify(remote.notifications))
      localStorage.setItem(userStorageKey(ONBOARDING_KEY), String(remote.onboarding_completed))
      setStatus("ready")
      hydrated.current = true
    }).catch((cause) => {
      if (!active) return
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar as preferências.")
      setStatus("error")
      hydrated.current = true
    })
    return () => { active = false }
  }, [backend])

  useEffect(() => {
    if (!hydrated.current) return
    applyTheme(preferences.theme)
    localStorage.setItem(userStorageKey(NOTIFICATIONS_KEY), JSON.stringify(preferences.notifications))
    localStorage.setItem(userStorageKey(ONBOARDING_KEY), String(preferences.onboarding_completed))
    if (!backend) return
    setStatus("saving")
    const timer = window.setTimeout(() => {
      savePreferences(preferences).then(() => {
        setStatus("ready")
        setError(null)
      }).catch((cause) => {
        setError(cause instanceof Error ? cause.message : "Não foi possível salvar as preferências.")
        setStatus("error")
      })
    }, 450)
    return () => window.clearTimeout(timer)
  }, [backend, preferences.theme, preferences.notifications, preferences.notify_email, preferences.onboarding_completed])

  const setAppearance = useCallback((theme: ThemeMode) => {
    setPreferences((current) => ({ ...current, theme }))
  }, [])
  const toggleNotification = useCallback((key: keyof NotificationPreferences) => {
    setPreferences((current) => ({ ...current, notifications: { ...current.notifications, [key]: !current.notifications[key] } }))
  }, [])
  const setNotifyEmail = useCallback((enabled: boolean) => setPreferences((current) => ({ ...current, notify_email: enabled })), [])
  const completeOnboarding = useCallback(() => {
    localStorage.setItem(userStorageKey(ONBOARDING_KEY), "true")
    setPreferences((current) => ({ ...current, onboarding_completed: true }))
  }, [])

  const value = useMemo(() => ({ ...preferences, status, error, setAppearance, toggleNotification, setNotifyEmail, completeOnboarding }), [preferences, status, error, setAppearance, toggleNotification, setNotifyEmail, completeOnboarding])
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences(): PreferencesContextValue {
  const value = useContext(PreferencesContext)
  if (!value) throw new Error("usePreferences deve ser usado dentro de PreferencesProvider")
  return value
}
