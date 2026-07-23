import { useEffect, useState } from "react"
import { Button } from "../../components/ui/Button"
import { Icon, SectionCard } from "../../design-system"
import { hasCalendarBackend } from "./api"
import { useCalendar } from "./store"

function formatConnectionDate(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
}

export function GoogleCalendarSection() {
  const {
    connection,
    connectionStatus,
    connectionError,
    actionStatus,
    refreshConnection,
    connect,
    disconnect,
  } = useCalendar()
  const [callbackMessage, setCallbackMessage] = useState<string | null>(null)
  const backend = hasCalendarBackend()
  const busy = actionStatus !== "idle"
  const connected = connection.status === "connected"
  const reconnect = connection.status === "reconnect_required"

  useEffect(() => {
    const callback = new URLSearchParams(window.location.search).get("calendar")
    if (callback === "connected") setCallbackMessage("Google Calendar conectado com sucesso.")
    if (callback === "denied") setCallbackMessage("A permissão do Google Calendar não foi concedida.")
    if (callback === "error") setCallbackMessage("Não foi possível concluir a conexão com o Google.")
    void refreshConnection(Boolean(callback))
    if (callback) {
      window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.hash}`)
    }
  }, [refreshConnection])

  const disconnectWithConfirmation = () => {
    if (!window.confirm("Desconectar o Google Calendar deste perfil?")) return
    void disconnect()
  }

  const statusLabel = connectionStatus === "loading"
    ? "Verificando"
    : connected
      ? "Conectado"
      : reconnect
        ? "Reconectar"
        : "Desconectado"
  const statusTone = connected
    ? "bg-tertiary/12 text-tertiary"
    : reconnect
      ? "bg-warning/15 text-warning"
      : "bg-surface-container-high text-muted"
  const lastSync = formatConnectionDate(connection.syncedAt)

  return (
    <SectionCard
      title="Google Calendar"
      description="Compromissos externos na agenda, em modo somente leitura"
      icon={<Icon name="calendar_month" className="text-[20px] text-primary" />}
      action={<span className={`rounded-md px-2 py-1 text-xs font-medium ${statusTone}`}>{statusLabel}</span>}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-outline-variant bg-surface-container text-primary">
            <Icon name={connected ? "event_available" : "event"} className="text-[19px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-on-surface">
              {connected
                ? connection.accountEmail || "Conta Google vinculada"
                : reconnect
                  ? "A autorização precisa ser renovada"
                  : "Nenhuma conta Google conectada"}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              {connected
                ? `Os eventos aparecem junto das tarefas e não podem ser editados no Level OS.${lastSync ? ` Última sincronização: ${lastSync}.` : ""}`
                : reconnect
                  ? "Reconecte a conta para voltar a visualizar os eventos na agenda."
                  : "Conecte somente se quiser visualizar seus eventos na rotina."}
            </p>
          </div>
        </div>

        {callbackMessage ? <p role="status" className="rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-xs text-on-surface-variant">{callbackMessage}</p> : null}
        {connectionError ? <p role="alert" className="text-xs text-error">{connectionError}</p> : null}
        {!backend ? <p className="text-xs text-muted">A conexão fica disponível no aplicativo autenticado.</p> : null}

        <div className="flex flex-wrap justify-end gap-2 border-t border-outline-variant pt-4">
          {connected ? (
            <Button type="button" variant="secondary" disabled={busy} onClick={disconnectWithConfirmation}>
              <Icon name="cloud_off" className="text-[17px]" />
              {actionStatus === "disconnecting" ? "Desconectando…" : "Desconectar"}
            </Button>
          ) : (
            <Button type="button" disabled={busy || !backend} onClick={() => void connect()}>
              <Icon name="calendar_month" className="text-[17px]" />
              {actionStatus === "connecting" ? "Abrindo Google…" : reconnect ? "Reconectar" : "Conectar Google Calendar"}
            </Button>
          )}
        </div>
      </div>
    </SectionCard>
  )
}
