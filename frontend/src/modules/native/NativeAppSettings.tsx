import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Icon, SectionCard } from "../../design-system";
import {
  authenticateNativeUser,
  biometricLockEnabled,
  checkNativeBiometry,
  hapticError,
  hapticSuccess,
  isNativeApp,
  nativePushEnabled,
  setBiometricLockEnabled,
  setNativePushEnabled,
} from "./device";

export function NativeAppSettings() {
  const native = isNativeApp();
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(biometricLockEnabled);
  const [pushEnabled, setPushEnabledState] = useState(nativePushEnabled);
  const [busy, setBusy] = useState<"biometric" | "push" | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!native) return;
    let active = true;
    void checkNativeBiometry()
      .then((result) => {
        if (!active) return;
        setBiometricAvailable(Boolean(result?.isAvailable));
        if (!result?.isAvailable && biometricLockEnabled()) {
          setBiometricLockEnabled(false);
          setBiometricEnabledState(false);
        }
      })
      .catch(() => {
        if (active) setBiometricAvailable(false);
      });
    return () => { active = false; };
  }, [native]);

  if (!native) return null;

  const toggleBiometric = async () => {
    setBusy("biometric");
    setStatus(null);
    try {
      if (!biometricAvailable) throw new Error("Cadastre uma biometria nas configurações do aparelho primeiro.");
      await authenticateNativeUser();
      const next = !biometricEnabled;
      setBiometricLockEnabled(next);
      setBiometricEnabledState(next);
      setStatus(next ? "Bloqueio biométrico ativado." : "Bloqueio biométrico desativado.");
      await hapticSuccess();
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : "Não foi possível alterar o bloqueio biométrico.");
      await hapticError();
    } finally {
      setBusy(null);
    }
  };

  const togglePush = async () => {
    setBusy("push");
    setStatus(null);
    const next = !pushEnabled;
    try {
      const { disableNativePush, enableNativePush } = await import("./push");
      if (next) await enableNativePush();
      else await disableNativePush();
      setNativePushEnabled(next);
      setPushEnabledState(next);
      setStatus(next ? "Notificações neste aparelho ativadas." : "Notificações neste aparelho desativadas.");
      await hapticSuccess();
    } catch (cause) {
      setNativePushEnabled(false);
      setPushEnabledState(false);
      setStatus(cause instanceof Error ? cause.message : "Não foi possível ativar notificações neste aparelho.");
      await hapticError();
    } finally {
      setBusy(null);
    }
  };

  return (
    <SectionCard
      title="Aplicativo instalado"
      description="Recursos nativos deste aparelho"
      icon={<Icon name="smartphone" className="text-[20px] text-primary" />}
      bodyClassName="p-0"
    >
      <div className="divide-y divide-outline-variant">
        <NativeToggle
          title="Desbloqueio biométrico"
          description={biometricAvailable ? "Protege o app ao retornar do segundo plano" : "Biometria indisponível ou não cadastrada"}
          checked={biometricEnabled}
          disabled={busy !== null || !biometricAvailable}
          onChange={() => void toggleBiometric()}
        />
        <NativeToggle
          title="Notificações no aparelho"
          description="Receba alertas mesmo quando o app estiver fechado"
          checked={pushEnabled}
          disabled={busy !== null}
          onChange={() => void togglePush()}
        />
      </div>
      {busy ? <p role="status" className="px-5 py-3 text-xs text-muted">Atualizando recurso nativo…</p> : null}
      {status ? <p role="status" className="px-5 py-3 text-xs text-on-surface-variant">{status}</p> : null}
    </SectionCard>
  );
}

function NativeToggle({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex min-h-16 items-center justify-between gap-4 px-5 py-3">
      <span>
        <span className="block text-sm font-medium text-on-surface">{title}</span>
        <span className="block text-xs text-muted">{description}</span>
      </span>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} aria-label={title} />
    </label>
  );
}
