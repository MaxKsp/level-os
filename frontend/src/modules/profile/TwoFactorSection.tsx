import { useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "../../components/ui/Button"
import { Modal } from "../../components/ui/Modal"
import { Icon, SectionCard } from "../../design-system"
import { useIdentity } from "../identity/store"
import { confirmTotp, disableTotp, enrollTotp } from "./securityApi"
import { SupabaseTwoFactorSection } from "./SupabaseTwoFactorSection"

const inputClass = "w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary"

export function TwoFactorSection() {
  const { identity, refresh } = useIdentity()
  if (identity.auth_provider === "supabase" && window.LEVEL_OS_AUTH_CONFIG) {
    return <SupabaseTwoFactorSection hasLegacyFactor={identity.totp_enabled} onManagedFactorVerified={refresh} />
  }
  return <LegacyTwoFactorSection />
}

function LegacyTwoFactorSection() {
  const { identity, refresh } = useIdentity()
  const [enrollment, setEnrollment] = useState<{ secret: string; uri: string } | null>(null)
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startEnrollment = async () => {
    setBusy(true); setError(null)
    try {
      const result = await enrollTotp()
      setEnrollment({ secret: result.secret, uri: result.otpauth_uri })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível iniciar o 2FA.")
    } finally { setBusy(false) }
  }

  const confirm = async () => {
    if (!/^\d{6}$/.test(code)) { setError("Digite o código de seis dígitos do autenticador."); return }
    setBusy(true); setError(null)
    try {
      setBackupCodes(await confirmTotp(code))
      setEnrollment(null); setCode("")
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Código inválido.")
    } finally { setBusy(false) }
  }

  const disable = async () => {
    setBusy(true); setError(null)
    try {
      await disableTotp(password)
      setPassword("")
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível desativar o 2FA.")
    } finally { setBusy(false) }
  }

  return <>
    <SectionCard title="Autenticação em duas etapas" description="Proteja o acesso com um aplicativo autenticador" icon={<Icon name="verified_user" className="text-[20px] text-primary" />}>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-on-surface">{identity.totp_enabled ? "2FA ativado" : "2FA desativado"}</p>
            <p className="mt-1 text-xs leading-5 text-muted">{identity.totp_enabled ? "Um código temporário será exigido no login." : "Use Google Authenticator, 1Password, Authy ou outro app TOTP."}</p>
          </div>
          <span className={identity.totp_enabled ? "rounded-md bg-tertiary/12 px-2 py-1 text-[11px] font-medium text-tertiary" : "rounded-md bg-surface-container-high px-2 py-1 text-[11px] font-medium text-muted"}>
            {identity.totp_enabled ? "Ativo" : "Inativo"}
          </span>
        </div>

        {!identity.totp_enabled && !enrollment ? <Button type="button" variant="secondary" className="w-full" disabled={busy || !window.CSRF_TOKEN} onClick={() => void startEnrollment()}>
          <Icon name="qr_code_2" className="text-[18px]" /> Configurar 2FA
        </Button> : null}

        {enrollment ? <div className="space-y-4 border-t border-outline-variant pt-4">
          <div className="mx-auto w-fit rounded-xl bg-white p-3"><QRCodeSVG value={enrollment.uri} size={164} level="M" /></div>
          <p className="text-center text-xs leading-5 text-muted">Leia o QR Code e confirme com o código atual. Se necessário, use a chave <span className="select-all font-mono text-on-surface">{enrollment.secret}</span>.</p>
          <input className={inputClass} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" aria-label="Código do autenticador" />
          <div className="flex gap-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => { setEnrollment(null); setCode(""); setError(null) }}>Cancelar</Button>
            <Button type="button" className="flex-1" disabled={busy || code.length !== 6} onClick={() => void confirm()}>Confirmar</Button>
          </div>
        </div> : null}

        {identity.totp_enabled ? <div className="space-y-3 border-t border-outline-variant pt-4">
          {identity.has_password ? <input className={inputClass} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Confirme sua senha" aria-label="Senha atual" /> : null}
          <Button type="button" variant="danger" className="w-full" disabled={busy || (identity.has_password && !password)} onClick={() => void disable()}>Desativar 2FA</Button>
        </div> : null}
        {error ? <p role="alert" className="text-xs text-error">{error}</p> : null}
      </div>
    </SectionCard>

    <Modal isOpen={backupCodes.length > 0} onClose={() => setBackupCodes([])} title="Códigos de recuperação" description="Guarde estes códigos em um local seguro. Cada código só pode ser usado uma vez." icon="key">
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-outline-variant bg-surface-container p-3 font-mono text-sm text-on-surface">
        {backupCodes.map((item) => <span key={item} className="select-all">{item}</span>)}
      </div>
      <Button type="button" className="mt-4 w-full" onClick={() => setBackupCodes([])}>Já guardei os códigos</Button>
    </Modal>
  </>
}
