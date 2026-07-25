import { Capacitor } from "@capacitor/core";
import type { CheckBiometryResult } from "@aparajita/capacitor-biometric-auth";
import { userStorageKey } from "../../lib/userStorage";

const BIOMETRIC_LOCK_KEY = "level-os:native-biometric-lock:v1";
const PUSH_ENABLED_KEY = "level-os:native-push-enabled:v1";

export const NATIVE_PREFERENCE_EVENT = "level-os:native-preference";

export type NativePreference = "biometric" | "push";

export interface NativePreferenceEventDetail {
  preference: NativePreference;
  enabled: boolean;
}

function readBooleanPreference(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(userStorageKey(key)) === "true";
  } catch {
    return false;
  }
}

function writeBooleanPreference(key: string, enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(userStorageKey(key), String(enabled));
  } catch {
    // Preferências nativas não são críticas para o funcionamento do app.
  }
}

function emitPreference(preference: NativePreference, enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<NativePreferenceEventDetail>(NATIVE_PREFERENCE_EVENT, {
    detail: { preference, enabled },
  }));
}

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export function biometricLockEnabled(): boolean {
  return readBooleanPreference(BIOMETRIC_LOCK_KEY);
}

export function setBiometricLockEnabled(enabled: boolean): void {
  writeBooleanPreference(BIOMETRIC_LOCK_KEY, enabled);
  emitPreference("biometric", enabled);
}

export function nativePushEnabled(): boolean {
  return readBooleanPreference(PUSH_ENABLED_KEY);
}

export function setNativePushEnabled(enabled: boolean): void {
  writeBooleanPreference(PUSH_ENABLED_KEY, enabled);
  emitPreference("push", enabled);
}

export async function checkNativeBiometry(): Promise<CheckBiometryResult | null> {
  if (!isNativeApp()) return null;
  const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
  return BiometricAuth.checkBiometry();
}

export async function authenticateNativeUser(): Promise<void> {
  if (!isNativeApp()) return;
  const { AndroidBiometryStrength, BiometricAuth } = await import("@aparajita/capacitor-biometric-auth");
  await BiometricAuth.authenticate({
    reason: "Desbloqueie o Level OS",
    cancelTitle: "Cancelar",
    allowDeviceCredential: true,
    iosFallbackTitle: "Usar código do aparelho",
    androidTitle: "Desbloquear Level OS",
    androidSubtitle: "Confirme sua identidade para acessar seus dados",
    androidConfirmationRequired: false,
    androidBiometryStrength: AndroidBiometryStrength.weak,
  });
}

export function isBiometricCancellation(error: unknown): boolean {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : "";
  return ["userCancel", "appCancel", "systemCancel"].includes(code);
}

async function safeHaptic(action: () => Promise<void>): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await action();
  } catch {
    // Haptics é aprimoramento progressivo; nunca bloqueia a ação principal.
  }
}

export function hapticSelection(): Promise<void> {
  return safeHaptic(async () => {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
  });
}

export function hapticSuccess(): Promise<void> {
  return safeHaptic(async () => {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: NotificationType.Success });
  });
}

export function hapticError(): Promise<void> {
  return safeHaptic(async () => {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: NotificationType.Error });
  });
}

export const NATIVE_STORAGE_BASE_KEYS = [
  BIOMETRIC_LOCK_KEY,
  PUSH_ENABLED_KEY,
] as const;
