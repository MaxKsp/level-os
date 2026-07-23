import { useEffect, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { exchangePhpSession, getSupabaseClient } from "../../auth/supabaseClient"
import { Button } from "../../components/ui/Button"
import { Icon, SectionCard } from "../../design-system"

const inputClass = "w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2.5 font-mono text-sm tabular-nums text-on-surface outline-none focus:border-primary"

interface Enrollment {
  factorId: string
  secret: string
  uri: string
}

interface SupabaseTwoFactorSectionProps {
  hasLegacyFactor?: boolean
  onManagedFactorVerified?: () => Promise<void> | void
}

export function SupabaseTwoFactorSection({ hasLegacyFactor = false, onManagedFactorVerified }: SupabaseTwoFactorSectionProps) {
  const supabase = getSupabaseClient()
  const [factorId, setFactorId] = useState<string | null>(null)
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!supabase) {
      setBusy(false)
      setError("A autenticação gerenciada não está disponível nesta sessão.")
      return () => { active = false }
    }
    void supabase.mfa.listFactors().then(({ data, error: listError }) => {
      if (!active) return
      if (listError) setError("Não foi possível consultar a autenticação em duas etapas.")
      setFactorId(data?.totp.find((factor) => factor.status === "verified")?.id ?? null)
      setBusy(false)
    })
    return () => { active = false }
  }, [supabase])

  const startEnrollment = async () => {
    if (!supabase) return
    setBusy(true); setError(null)
    const { data, error: enrollError } = await supabase.mfa.enroll({
      factorType: "totp",
      friendlyName: "Level OS",
    })
    if (enrollError || !data || data.type !== "totp") {
      setError(enrollError?.message ?? "Não foi possível iniciar o 2FA.")
    } else {
      setEnrollment({ factorId: data.id, secret: data.totp.secret, uri: data.totp.uri })
    }
    setBusy(false)
  }

  const confirm = async () => {
    if (!supabase || !enrollment || !/^\d{6}$/.test(code)) {
      setError("Digite o código de seis dígitos do autenticador.")
      return
    }
    setBusy(true); setError(null)
    const { error: verifyError } = await supabase.mfa.challengeAndVerify({ factorId: enrollment.factorId, code })
    if (verifyError) {
      setError("Código inválido ou expirado.")
    } else {
      setFactorId(enrollment.factorId)
      setEnrollment(null)
      setCode("")
      const session = await supabase.getSession()
      if (session.data.session) {
        try {
          await exchangePhpSession(session.data.session)
          await onManagedFactorVerified?.()
        } catch {
          setError("2FA ativado. A limpeza do fator anterior será concluída no próximo acesso.")
        }
      }
    }
    setBusy(false)
  }

  const cancelEnrollment = async () => {
    if (supabase && enrollment) await supabase.mfa.unenroll({ factorId: enrollment.factorId })
    setEnrollment(null); setCode(""); setError(null)
  }

  const disable = async () => {
    if (!supabase || !factorId || !/^\d{6}$/.test(code)) {
      setError("Confirme com o código atual de seis dígitos.")
      return
    }
    setBusy(true); setError(null)
    const verified = await supabase.mfa.challengeAndVerify({ factorId, code })
    if (verified.error) {
      setError("Código inválido ou expirado.")
      setBusy(false)
      return
    }
    const removed = await supabase.mfa.unenroll({ factorId })
    if (removed.error) {
      setError("Não foi possível desativar o 2FA.")
    } else {
      setFactorId(null)
      setCode("")
    }
    setBusy(false)
  }

  const enabled = Boolean(factorId)

  return (
    <SectionCard title="Autenticação em duas etapas" description="Proteja o acesso com um aplicativo autenticador" icon={<Icon name="verified_user" className="text-[20px] text-primary" />}>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-on-surface">{enabled ? "2FA ativado" : "2FA desativado"}</p>
            <p className="mt-1 text-xs leading-5 text-muted">{enabled ? "O Supabase exigirá um código temporário no login." : "Use Google Authenticator, 1Password, Authy ou outro app TOTP."}</p>
          </div>
          <span className={enabled ? "rounded-md bg-tertiary/12 px-2 py-1 text-[11px] font-medium text-tertiary" : "rounded-md bg-surface-container-high px-2 py-1 text-[11px] font-medium text-muted"}>
            {busy ? "Verificando" : enabled ? "Ativo" : "Inativo"}
          </span>
        </div>

        {hasLegacyFactor && !enabled ? <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs leading-5 text-muted">
          Seu 2FA anterior continua protegendo a conta. Ele será removido somente após você confirmar o novo autenticador do Supabase.
        </p> : null}

        {!enabled && !enrollment ? <Button type="button" variant="secondary" className="w-full" disabled={busy || !supabase} onClick={() => void startEnrollment()}>
          <Icon name="qr_code_2" className="text-[18px]" /> Configurar 2FA
        </Button> : null}

        {enrollment ? <div className="space-y-4 border-t border-outline-variant pt-4">
          <div className="mx-auto w-fit rounded-xl bg-white p-3"><QRCodeSVG value={enrollment.uri} size={164} level="M" /></div>
          <p className="text-center text-xs leading-5 text-muted">Leia o QR Code e confirme com o código atual. Se necessário, use a chave <span className="select-all font-mono text-on-surface">{enrollment.secret}</span>.</p>
          <input className={inputClass} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" aria-label="Código do autenticador" />
          <div className="flex gap-2">
            <Button type="button" variant="ghost" className="flex-1" disabled={busy} onClick={() => void cancelEnrollment()}>Cancelar</Button>
            <Button type="button" className="flex-1" disabled={busy || code.length !== 6} onClick={() => void confirm()}>Confirmar</Button>
          </div>
        </div> : null}

        {enabled ? <div className="space-y-3 border-t border-outline-variant pt-4">
          <p className="text-xs leading-5 text-muted">Para desativar, confirme sua identidade com o código atual do autenticador.</p>
          <input className={inputClass} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" aria-label="Código atual do autenticador" />
          <Button type="button" variant="danger" className="w-full" disabled={busy || code.length !== 6} onClick={() => void disable()}>Desativar 2FA</Button>
        </div> : null}
        {error ? <p role="alert" className="text-xs text-error">{error}</p> : null}
      </div>
    </SectionCard>
  )
}
