import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../design-system";
import {
  NATIVE_PREFERENCE_EVENT,
  authenticateNativeUser,
  biometricLockEnabled,
  hapticError,
  isBiometricCancellation,
  isNativeApp,
  type NativePreferenceEventDetail,
} from "./device";

export function NativeSecurityGate({ children }: { children: ReactNode }) {
  const native = isNativeApp();
  const enabledRef = useRef(native && biometricLockEnabled());
  const backgroundedRef = useRef(false);
  const authenticatingRef = useRef(false);
  const [locked, setLocked] = useState(enabledRef.current);
  const [error, setError] = useState<string | null>(null);

  const unlock = useCallback(async () => {
    if (!enabledRef.current || authenticatingRef.current) {
      if (!enabledRef.current) setLocked(false);
      return;
    }
    authenticatingRef.current = true;
    setError(null);
    try {
      await authenticateNativeUser();
      setLocked(false);
    } catch (cause) {
      setLocked(true);
      if (!isBiometricCancellation(cause)) {
        setError("Não foi possível confirmar sua identidade. Verifique a biometria ou o bloqueio do aparelho.");
        await hapticError();
      }
    } finally {
      authenticatingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!native) return;
    if (enabledRef.current) void unlock();

    const preferenceListener = (event: Event) => {
      const detail = (event as CustomEvent<NativePreferenceEventDetail>).detail;
      if (detail?.preference !== "biometric") return;
      enabledRef.current = detail.enabled;
      if (!detail.enabled) setLocked(false);
    };
    window.addEventListener(NATIVE_PREFERENCE_EVENT, preferenceListener);

    let active = true;
    let removeStateListener: (() => Promise<void>) | null = null;
    void import("@capacitor/app").then(({ App: CapacitorApp }) =>
      CapacitorApp.addListener("appStateChange", ({ isActive }) => {
        if (!enabledRef.current) return;
        if (!isActive) {
          backgroundedRef.current = true;
          setLocked(true);
        } else if (backgroundedRef.current) {
          backgroundedRef.current = false;
          void unlock();
        }
      }),
    ).then((handle) => {
      if (!active) void handle.remove();
      else removeStateListener = () => handle.remove();
    });

    return () => {
      active = false;
      window.removeEventListener(NATIVE_PREFERENCE_EVENT, preferenceListener);
      if (removeStateListener) void removeStateListener();
    };
  }, [native, unlock]);

  if (!native || !locked) return children;

  return (
    <main className="fixed inset-0 z-[200] grid min-h-dvh place-items-center bg-background px-6 text-on-surface">
      <section className="w-full max-w-sm border-y border-outline-variant py-10 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon name="fingerprint" className="text-[30px]" />
        </div>
        <p className="mt-5 text-xs font-medium uppercase tracking-[0.16em] text-primary">Level OS protegido</p>
        <h1 className="mt-2 text-2xl font-semibold">Desbloqueie para continuar</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Seus dados permanecem ocultos enquanto o aplicativo está bloqueado.</p>
        {error ? <p role="alert" className="mt-4 text-sm text-error">{error}</p> : null}
        <Button className="mt-6 w-full" onClick={() => void unlock()}>
          <Icon name="fingerprint" className="text-[19px]" />
          Desbloquear
        </Button>
        <a href="/logout.php" className="mt-4 inline-flex min-h-11 items-center text-sm text-muted underline-offset-4 hover:text-on-surface hover:underline">
          Sair da conta
        </a>
      </section>
    </main>
  );
}
