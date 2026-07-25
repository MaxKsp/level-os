import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import {
  PushNotifications,
  type ActionPerformed,
  type RegistrationError,
  type Token,
} from "@capacitor/push-notifications";
import { hapticError, hapticSuccess, isNativeApp } from "./device";

const ALLOWED_ROUTES = new Set([
  "/",
  "/financeiro",
  "/agenda",
  "/treinos",
  "/alimentacao",
  "/perfil",
]);

let listenerHandles: PluginListenerHandle[] = [];
let registrationPromise: Promise<void> | null = null;
let registrationResolve: (() => void) | null = null;
let registrationReject: ((reason: Error) => void) | null = null;
let registrationTimer: number | null = null;
let registered = false;

function currentPlatform(): "android" | "ios" {
  return Capacitor.getPlatform() === "ios" ? "ios" : "android";
}

async function persistDevice(action: "register" | "unregister_all", token?: string): Promise<void> {
  const response = await fetch("/api/push-devices.php", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": window.CSRF_TOKEN ?? "",
    },
    body: JSON.stringify({
      action,
      platform: currentPlatform(),
      ...(token ? { token } : {}),
    }),
  });
  const body = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(body?.error || `Falha ao registrar dispositivo (HTTP ${response.status}).`);
  }
}

function clearRegistrationWait(): void {
  if (registrationTimer !== null) window.clearTimeout(registrationTimer);
  registrationTimer = null;
  registrationResolve = null;
  registrationReject = null;
  registrationPromise = null;
}

function safeRouteFromAction(action: ActionPerformed): string | null {
  const raw = action.notification.data?.path;
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) return null;
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin || !ALLOWED_ROUTES.has(url.pathname)) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

async function handleRegistration(token: Token): Promise<void> {
  try {
    await persistDevice("register", token.value);
    registered = true;
    registrationResolve?.();
    await hapticSuccess();
  } catch (error) {
    registrationReject?.(error instanceof Error ? error : new Error("Falha ao registrar o dispositivo."));
  } finally {
    clearRegistrationWait();
  }
}

function handleRegistrationError(error: RegistrationError): void {
  registered = false;
  registrationReject?.(new Error(error.error || "O serviço de push nativo não está configurado neste aparelho."));
  void hapticError();
  clearRegistrationWait();
}

async function ensureListeners(): Promise<void> {
  if (listenerHandles.length > 0) return;
  listenerHandles = await Promise.all([
    PushNotifications.addListener("registration", (token) => { void handleRegistration(token); }),
    PushNotifications.addListener("registrationError", handleRegistrationError),
    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const route = safeRouteFromAction(action);
      if (route) window.location.assign(route);
    }),
  ]);
}

export async function enableNativePush(): Promise<void> {
  if (!isNativeApp()) return;
  if (!window.CSRF_TOKEN) throw new Error("A sessão precisa estar autenticada para ativar notificações.");
  if (registrationPromise) return registrationPromise;

  await ensureListeners();
  if (registered) return;
  let permission = await PushNotifications.checkPermissions();
  if (permission.receive === "prompt") permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") {
    throw new Error("Permissão de notificações não concedida no aparelho.");
  }

  registrationPromise = new Promise<void>((resolve, reject) => {
    registrationResolve = resolve;
    registrationReject = reject;
    registrationTimer = window.setTimeout(() => {
      reject(new Error("O registro push demorou demais. Verifique a configuração do Firebase/APNs."));
      clearRegistrationWait();
    }, 15000);
  });
  const pendingRegistration = registrationPromise;
  try {
    await PushNotifications.register();
  } catch (cause) {
    registrationReject?.(cause instanceof Error ? cause : new Error("Falha ao iniciar o registro push."));
    clearRegistrationWait();
    throw cause;
  }
  return pendingRegistration;
}

export async function disableNativePush(): Promise<void> {
  if (!isNativeApp()) return;
  registered = false;
  await Promise.allSettled([
    PushNotifications.unregister(),
    window.CSRF_TOKEN ? persistDevice("unregister_all") : Promise.resolve(),
  ]);
}

export async function disposeNativePush(): Promise<void> {
  const handles = listenerHandles;
  listenerHandles = [];
  await Promise.allSettled(handles.map((handle) => handle.remove()));
}
