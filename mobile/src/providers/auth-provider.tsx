import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  ApiError,
  bootstrapPhpSession,
  endPhpSession,
  establishLegacyPhpSession,
  establishPhpSession,
} from '@/lib/api';
import { secureStorage } from '@/lib/secure-storage';
import { supabase } from '@/lib/supabase';

const BIOMETRIC_KEY = 'level_os_biometric_unlock';
const AUTH_STARTED_AT_KEY = 'level_os_auth_started_at';
const AUTH_BOOTSTRAP_TIMEOUT_MS = 12_000;
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1_000;
const BIOMETRIC_BACKGROUND_GRACE_MS = 5 * 60 * 1_000;
const NATIVE_AUTH_CALLBACK = Linking.createURL('auth/callback');

WebBrowser.maybeCompleteAuthSession();

function withTimeout<T>(operation: PromiseLike<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('auth_bootstrap_timeout')),
      AUTH_BOOTSTRAP_TIMEOUT_MS,
    );
    Promise.resolve(operation).then(resolve, reject).finally(() => clearTimeout(timeout));
  });
}

function authMessage(reason: unknown): string {
  if (reason instanceof ApiError) {
    if (reason.code === 'invalid_credentials' || reason.code === 'invalid_authentication') {
      return 'E-mail ou senha inválidos.';
    }
    if (reason.code === 'email_unverified') {
      return 'Confirme seu e-mail antes de entrar.';
    }
    if (reason.code === 'link_required') {
      return 'Esta conta já existia no Level OS. Entre com a mesma senha usada no site para vinculá-la com segurança.';
    }
    if (reason.code === 'mfa_required' || reason.code === 'supabase_mfa_required') {
      return 'A conta exige verificação em duas etapas. Conclua o primeiro acesso pelo site.';
    }
    if (reason.code === 'too_many_requests') {
      return 'Muitas tentativas seguidas. Aguarde um minuto e tente novamente.';
    }
    if (reason.code === 'authentication_unavailable' || reason.status >= 500) {
      return 'O servidor não conseguiu concluir o acesso. Tente novamente em alguns instantes.';
    }
  }

  const raw = reason instanceof Error ? reason.message : String(reason ?? '');
  if (/invalid login credentials/i.test(raw)) return 'E-mail ou senha inválidos.';
  if (/email not confirmed/i.test(raw)) return 'Confirme seu e-mail antes de entrar.';
  if (/cancel|dismiss/i.test(raw)) return 'O acesso com Google foi cancelado.';
  if (/network|fetch|timeout/i.test(raw)) {
    return 'Sem conexão com o serviço de acesso. Verifique sua internet.';
  }
  return 'Não foi possível concluir o acesso ao Level OS.';
}

function authParams(url: string): URLSearchParams {
  const callback = new URL(url);
  const params = new URLSearchParams(callback.search);
  const fragment = new URLSearchParams(callback.hash.replace(/^#/, ''));
  fragment.forEach((value, key) => {
    if (!params.has(key)) params.set(key, value);
  });
  return params;
}

type AuthContextValue = {
  authenticated: boolean;
  loading: boolean;
  locked: boolean;
  session: Session | null;
  error: string | null;
  unlock(): Promise<boolean>;
  signIn(email: string, password: string): Promise<void>;
  signInWithGoogle(): Promise<void>;
  signUp(email: string, password: string): Promise<'authenticated' | 'confirmation_required'>;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  signOut(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingAuthCodes = useRef(new Map<string, Promise<Session>>());
  const biometricPrompt = useRef<Promise<boolean> | null>(null);
  const backgroundedAt = useRef<number | null>(null);
  const authFlowActive = useRef(false);
  const authenticatedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    authenticatedRef.current = authenticated;
  }, [authenticated]);

  const markSessionStarted = useCallback(async () => {
    await secureStorage.setItem(AUTH_STARTED_AT_KEY, String(Date.now()));
  }, []);

  const clearLocalAuth = useCallback(async () => {
    await secureStorage.removeItem(AUTH_STARTED_AT_KEY);
    if (mountedRef.current) setLocked(false);
  }, []);

  const sessionIsExpired = useCallback(async () => {
    const raw = await secureStorage.getItem(AUTH_STARTED_AT_KEY);
    if (!raw) {
      await markSessionStarted();
      return false;
    }
    const startedAt = Number(raw);
    return !Number.isFinite(startedAt) || Date.now() - startedAt >= SESSION_MAX_AGE_MS;
  }, [markSessionStarted]);

  const syncSession = useCallback(async (
    next: Session | null,
    localPassword?: string,
    freshLogin = false,
  ) => {
    if (!next) {
      authenticatedRef.current = false;
      setSession(null);
      setAuthenticated(false);
      return;
    }
    await establishPhpSession(next, localPassword);
    if (freshLogin) await markSessionStarted();
    authenticatedRef.current = true;
    setSession(next);
    setAuthenticated(true);
    setError(null);
  }, [markSessionStarted]);

  const unlock = useCallback(async (): Promise<boolean> => {
    if (biometricPrompt.current) return biometricPrompt.current;

    const operation = (async () => {
      const enabled = await secureStorage.getItem(BIOMETRIC_KEY) === 'enabled';
      if (!enabled) {
        if (mountedRef.current) setLocked(false);
        return true;
      }

      const [supported, enrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      if (!supported || !enrolled) {
        await secureStorage.removeItem(BIOMETRIC_KEY);
        if (mountedRef.current) {
          setLocked(false);
          setError('A biometria foi desativada porque não está configurada neste aparelho.');
        }
        return true;
      }

      if (mountedRef.current) setLocked(true);
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Desbloquear o Level OS',
        cancelLabel: 'Agora não',
        fallbackLabel: 'Usar desbloqueio do aparelho',
        disableDeviceFallback: false,
      });
      if (mountedRef.current && result.success) {
        setLocked(false);
        setError(null);
      }
      return result.success;
    })();

    biometricPrompt.current = operation;
    try {
      return await operation;
    } finally {
      biometricPrompt.current = null;
    }
  }, []);

  const acceptAuthUrl = useCallback(async (url: string): Promise<Session | null> => {
    const params = authParams(url);
    const oauthError = params.get('error_description') ?? params.get('error');
    if (oauthError) throw new Error(oauthError);

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const code = params.get('code');
    if (!code && !(accessToken && refreshToken)) return null;

    const requestKey = code ?? accessToken!;
    const existing = pendingAuthCodes.current.get(requestKey);
    if (existing) return existing;

    const exchangePromise = (async () => {
      const exchange = code
        ? await supabase.auth.exchangeCodeForSession(code)
        : await supabase.auth.setSession({
            access_token: accessToken!,
            refresh_token: refreshToken!,
          });
      if (exchange.error || !exchange.data.session) {
        throw new Error(exchange.error?.message ?? 'auth_exchange_failed');
      }
      if (params.get('mode') === 'recovery' || params.get('type') === 'recovery') {
        router.replace('/reset-password');
        return exchange.data.session;
      }
      await syncSession(exchange.data.session, undefined, true);
      router.replace('/(app)');
      return exchange.data.session;
    })();
    pendingAuthCodes.current.set(requestKey, exchangePromise);

    try {
      return await exchangePromise;
    } finally {
      pendingAuthCodes.current.delete(requestKey);
    }
  }, [syncSession]);

  useEffect(() => {
    let mounted = true;
    mountedRef.current = true;

    const report = (reason: unknown) => {
      if (mounted) setError(authMessage(reason));
    };

    const expireSession = async () => {
      await endPhpSession().catch(() => undefined);
      await supabase.auth.signOut().catch(() => undefined);
      await clearLocalAuth();
      if (!mounted) return;
      authenticatedRef.current = false;
      setSession(null);
      setAuthenticated(false);
      setError('Sua sessão expirou. Entre novamente para continuar.');
    };

    const protectCurrentSession = async () => {
      if (await sessionIsExpired()) {
        await expireSession();
        return false;
      }
      if (await secureStorage.getItem(BIOMETRIC_KEY) === 'enabled') {
        if (mounted) setLocked(true);
        await unlock();
      }
      return true;
    };

    const bootstrap = async () => {
      try {
        const initialUrl = await withTimeout(Linking.getInitialURL());
        if (initialUrl && await acceptAuthUrl(initialUrl)) return;

        const { data } = await withTimeout(supabase.auth.getSession());
        if (data.session) {
          if (!await protectCurrentSession()) return;
          await syncSession(data.session);
        } else {
          const phpAuthenticated = await withTimeout(bootstrapPhpSession());
          if (phpAuthenticated) {
            if (!await protectCurrentSession()) return;
            if (mounted) {
              authenticatedRef.current = true;
              setAuthenticated(true);
              setError(null);
            }
          }
        }
      } catch (reason) {
        if (mounted) {
          setSession(null);
          setAuthenticated(false);
        }
        authenticatedRef.current = false;
        report(reason);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void bootstrap();
    const linking = Linking.addEventListener('url', ({ url }) => {
      void acceptAuthUrl(url).catch(report);
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'SIGNED_OUT' && mounted) {
        authenticatedRef.current = false;
        setSession(null);
        setAuthenticated(false);
        return;
      }
      if (event === 'TOKEN_REFRESHED' && next) {
        void syncSession(next).catch(report);
      }
    });
    const appState = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        if (backgroundedAt.current === null) backgroundedAt.current = Date.now();
        return;
      }
      if (state !== 'active') return;

      const backgroundStarted = backgroundedAt.current;
      backgroundedAt.current = null;
      if (
        !authenticatedRef.current
        || authFlowActive.current
        || backgroundStarted === null
        || Date.now() - backgroundStarted < BIOMETRIC_BACKGROUND_GRACE_MS
      ) return;

      void (async () => {
        if (await sessionIsExpired()) {
          await expireSession();
          return;
        }
        if (await secureStorage.getItem(BIOMETRIC_KEY) === 'enabled') {
          setLocked(true);
          await unlock();
        }
      })().catch(report);
    });

    return () => {
      mounted = false;
      mountedRef.current = false;
      linking.remove();
      data.subscription.unsubscribe();
      appState.remove();
    };
  }, [
    acceptAuthUrl,
    clearLocalAuth,
    sessionIsExpired,
    syncSession,
    unlock,
  ]);

  const signUp = useCallback(async (email: string, password: string) => {
    setError(null);
    const result = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { emailRedirectTo: NATIVE_AUTH_CALLBACK },
    });
    if (result.error) {
      const message = authMessage(result.error);
      setError(message);
      throw new Error(message);
    }
    if (!result.data.session) return 'confirmation_required';
    try {
      await syncSession(result.data.session, undefined, true);
      router.replace('/(app)');
      return 'authenticated';
    } catch (reason) {
      const message = authMessage(reason);
      setError(message);
      throw new Error(message);
    }
  }, [syncSession]);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    authFlowActive.current = true;
    try {
      const result = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: NATIVE_AUTH_CALLBACK,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });
      if (result.error || !result.data.url) {
        throw result.error ?? new Error('google_oauth_failed');
      }

      const browser = await WebBrowser.openAuthSessionAsync(
        result.data.url,
        NATIVE_AUTH_CALLBACK,
      );
      if (browser.type !== 'success' || !browser.url) {
        throw new Error('google_oauth_cancelled');
      }
      if (!authenticatedRef.current) {
        const authenticatedSession = await acceptAuthUrl(browser.url);
        if (!authenticatedSession) throw new Error('google_oauth_invalid_callback');
      }
    } catch (reason) {
      const message = authMessage(reason);
      setError(message);
      throw new Error(message);
    } finally {
      authFlowActive.current = false;
      backgroundedAt.current = null;
    }
  }, [acceptAuthUrl]);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    const normalizedEmail = email.trim().toLowerCase();
    const result = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (result.error || !result.data.session) {
      const raw = result.error?.message ?? 'invalid login credentials';
      if (/invalid login credentials/i.test(raw)) {
        try {
          await establishLegacyPhpSession(normalizedEmail, password);
          await markSessionStarted();
          authenticatedRef.current = true;
          setSession(null);
          setAuthenticated(true);
          setError(null);
          router.replace('/(app)');
          return;
        } catch (legacyReason) {
          const message = authMessage(legacyReason);
          setError(message);
          throw new Error(message);
        }
      }
      const message = authMessage(result.error ?? new Error(raw));
      setError(message);
      throw new Error(message);
    }
    try {
      await syncSession(result.data.session, password, true);
      router.replace('/(app)');
    } catch (reason) {
      const message = authMessage(reason);
      authenticatedRef.current = false;
      setSession(null);
      setAuthenticated(false);
      setError(message);
      throw new Error(message);
    }
  }, [markSessionStarted, syncSession]);

  const requestPasswordReset = useCallback(async (email: string) => {
    setError(null);
    const result = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${NATIVE_AUTH_CALLBACK}?mode=recovery`,
    });
    if (result.error) {
      const message = authMessage(result.error);
      setError(message);
      throw new Error(message);
    }
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    setError(null);
    const result = await supabase.auth.updateUser({ password });
    if (result.error) {
      const message = authMessage(result.error);
      setError(message);
      throw new Error(message);
    }
    await supabase.auth.signOut();
    await clearLocalAuth();
    authenticatedRef.current = false;
    setSession(null);
    setAuthenticated(false);
    router.replace('/login');
  }, [clearLocalAuth]);

  const signOut = useCallback(async () => {
    await endPhpSession();
    await supabase.auth.signOut();
    await clearLocalAuth();
    authenticatedRef.current = false;
    setSession(null);
    setAuthenticated(false);
    router.replace('/login');
  }, [clearLocalAuth]);

  const value = useMemo(() => ({
    authenticated,
    loading,
    locked,
    session,
    error,
    unlock,
    signIn,
    signInWithGoogle,
    signUp,
    requestPasswordReset,
    updatePassword,
    signOut,
  }), [
    authenticated,
    loading,
    locked,
    session,
    error,
    unlock,
    signIn,
    signInWithGoogle,
    signUp,
    requestPasswordReset,
    updatePassword,
    signOut,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider ausente.');
  return value;
}
