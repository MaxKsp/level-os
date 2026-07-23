import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  CalendarApiError,
  disconnectCalendar,
  hasCalendarBackend,
  loadCalendarConnection,
  loadCalendarRange,
  startCalendarConnection,
} from "./api"
import {
  DISCONNECTED_CALENDAR,
  type CalendarRange,
  type GoogleCalendarConnection,
  type GoogleCalendarEvent,
} from "./contracts"

type RequestStatus = "idle" | "loading" | "ready" | "error"
type ActionStatus = "idle" | "connecting" | "disconnecting"

interface RangeState {
  events: GoogleCalendarEvent[]
  status: RequestStatus
  error: string | null
  updatedAt: number
}

interface CalendarContextValue {
  connection: GoogleCalendarConnection
  connectionStatus: RequestStatus
  connectionError: string | null
  actionStatus: ActionStatus
  refreshConnection: (force?: boolean) => Promise<void>
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  loadRange: (range: CalendarRange, force?: boolean) => Promise<void>
  readRange: (key: string) => RangeState
}

const EMPTY_RANGE: RangeState = {
  events: [],
  status: "idle",
  error: null,
  updatedAt: 0,
}
const RANGE_CACHE_MS = 60_000

const CalendarContext = createContext<CalendarContextValue | null>(null)

function messageFrom(cause: unknown): string {
  return cause instanceof Error ? cause.message : "Não foi possível acessar o Google Calendar."
}

function reconnectConnection(current: GoogleCalendarConnection): GoogleCalendarConnection {
  return { ...current, status: "reconnect_required" }
}

export function CalendarProvider({ children }: { children: ReactNode }) {
  const backend = hasCalendarBackend()
  const [connection, setConnection] = useState<GoogleCalendarConnection>(DISCONNECTED_CALENDAR)
  const [connectionStatus, setConnectionStatus] = useState<RequestStatus>(backend ? "idle" : "ready")
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [actionStatus, setActionStatus] = useState<ActionStatus>("idle")
  const [ranges, setRanges] = useState<Record<string, RangeState>>({})
  const rangesRef = useRef<Record<string, RangeState>>({})
  const connectionRequest = useRef<Promise<void> | null>(null)
  const rangeRequests = useRef(new Map<string, Promise<void>>())
  const rangeControllers = useRef(new Map<string, AbortController>())

  const refreshConnection = useCallback(async (force = false) => {
    if (!hasCalendarBackend()) {
      setConnection(DISCONNECTED_CALENDAR)
      setConnectionStatus("ready")
      return
    }
    if (!force && connectionStatus === "ready") return
    if (connectionRequest.current) return connectionRequest.current

    const request = (async () => {
      setConnectionStatus("loading")
      try {
        const next = await loadCalendarConnection()
        setConnection(next)
        setConnectionStatus("ready")
        setConnectionError(null)
      } catch (cause) {
        if (cause instanceof CalendarApiError && cause.code === "calendar_reconnect_required") {
          setConnection((current) => reconnectConnection(current))
          setConnectionStatus("ready")
        } else {
          setConnectionStatus("error")
        }
        setConnectionError(messageFrom(cause))
      }
    })().finally(() => {
      connectionRequest.current = null
    })
    connectionRequest.current = request
    return request
  }, [connectionStatus])

  const loadRange = useCallback(async (range: CalendarRange, force = false) => {
    if (!hasCalendarBackend()) return
    const current = rangesRef.current[range.key]
    if (!force && current?.status === "ready" && Date.now() - current.updatedAt < RANGE_CACHE_MS) return
    const active = rangeRequests.current.get(range.key)
    if (active) return active

    for (const [key, controller] of rangeControllers.current) {
      if (key !== range.key) controller.abort()
    }
    const controller = new AbortController()
    rangeControllers.current.set(range.key, controller)
    setRanges((values) => ({
      ...values,
      [range.key]: {
        events: values[range.key]?.events ?? [],
        status: "loading",
        error: null,
        updatedAt: values[range.key]?.updatedAt ?? 0,
      },
    }))

    const request = (async () => {
      try {
        const response = await loadCalendarRange(range, controller.signal)
        setConnection(response.connection)
        setConnectionStatus("ready")
        setConnectionError(null)
        setRanges((values) => ({
          ...values,
          [range.key]: { events: response.events, status: "ready", error: null, updatedAt: Date.now() },
        }))
      } catch (cause) {
        if (controller.signal.aborted) return
        if (cause instanceof CalendarApiError && cause.code === "calendar_reconnect_required") {
          setConnection((value) => reconnectConnection(value))
        }
        setRanges((values) => ({
          ...values,
          [range.key]: {
            events: values[range.key]?.events ?? [],
            status: "error",
            error: messageFrom(cause),
            updatedAt: values[range.key]?.updatedAt ?? 0,
          },
        }))
      }
    })().finally(() => {
      rangeRequests.current.delete(range.key)
      rangeControllers.current.delete(range.key)
    })
    rangeRequests.current.set(range.key, request)
    return request
  }, [])

  useEffect(() => {
    rangesRef.current = ranges
  }, [ranges])

  const connect = useCallback(async () => {
    if (!hasCalendarBackend()) {
      setConnectionError("Conecte pelo aplicativo autenticado para usar o Google Calendar.")
      return
    }
    setActionStatus("connecting")
    setConnectionError(null)
    try {
      const authorizationUrl = await startCalendarConnection()
      window.location.assign(authorizationUrl)
    } catch (cause) {
      setConnectionError(messageFrom(cause))
      setActionStatus("idle")
    }
  }, [])

  const disconnect = useCallback(async () => {
    if (!hasCalendarBackend()) return
    setActionStatus("disconnecting")
    setConnectionError(null)
    try {
      const next = await disconnectCalendar()
      for (const controller of rangeControllers.current.values()) controller.abort()
      rangeControllers.current.clear()
      rangeRequests.current.clear()
      rangesRef.current = {}
      setRanges({})
      setConnection(next)
      setConnectionStatus("ready")
    } catch (cause) {
      setConnectionError(messageFrom(cause))
    } finally {
      setActionStatus("idle")
    }
  }, [])

  const readRange = useCallback((key: string) => ranges[key] ?? EMPTY_RANGE, [ranges])
  const value = useMemo<CalendarContextValue>(() => ({
    connection,
    connectionStatus,
    connectionError,
    actionStatus,
    refreshConnection,
    connect,
    disconnect,
    loadRange,
    readRange,
  }), [actionStatus, connect, connection, connectionError, connectionStatus, disconnect, loadRange, readRange, refreshConnection])

  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>
}

export function useCalendar(): CalendarContextValue {
  const value = useContext(CalendarContext)
  if (!value) throw new Error("useCalendar deve ser usado dentro de CalendarProvider")
  return value
}

export function useCalendarRange(range: CalendarRange) {
  const { connection, connectionStatus, loadRange, readRange } = useCalendar()
  const state = readRange(range.key)
  useEffect(() => {
    void loadRange(range)
  }, [loadRange, range])
  return {
    connection,
    connectionStatus,
    events: state.events,
    status: state.status,
    error: state.error,
    retry: () => loadRange(range, true),
  }
}
