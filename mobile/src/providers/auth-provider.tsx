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

import {
  ApiError,
  bootstrapPhpSession,
  endPhpSession,
  establishLegacyPhpSession,
  establishPhpSession,
} from '@/lib/api';
import { appConfig } from '@/lib/config';
import { secureStorage } from '@/lib/secure-storage';
import { supabase } from '@/lib/supabase';

const BIOMETRIC_KEY = 'level_os_biometric_unlock';
const AUTH_BOOTSTRAP_TIMEOUT_MS = 12_000;
const MOBILE_WEB_CALLBACK = `${appConfig.apiUrl}/auth-supabase-callback.php?mobile=1`;

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
  if (/network|fetch|timeout/i.test(raw)) return 'Sem conexão com o serviço de acesso. Verifique sua internet.';
  return 'Não foi possível concluir o acesso ao Level OS.';
}

type AuthContextValue = {
  authenticated: boolean;
  loading: boolean;
  session: Session | null;
  error: string | null;
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
  const [error, setError] = useState<string | null>(null);
  const pendingAuthCodes = useRef(new Map<string, Promise<Session>>());

  const syncSession = useCallback(async (next: Session | null, localPassword?: string) => {
    if (!next) {
      setSession(null);
      setAuthenticated(false);
      return;
    }
    await establishPhpSession(next, localPassword);
    setSession(next);
    setAuthenticated(true);
    setError(null);
  }, []);

  const acceptAuthUrl = useCallback(async (url: string): Promise<Session | null> => {
    const callback = new URL(url);
    const oauthError = callback.searchParams.get('error_description')
      ?? callback.searchParams.get('error');
    if (oauthError) throw new Error(oauthError);

    const code = callback.searchParams.get('code');
    if (!code) return null;

    const existing = pendingAuthCodes.current.get(code);
    if (existing) return existing;

    const exchangePromise = (async () => {
      const exchange = await supabase.auth.exchangeCodeForSession(code);
      if (exchange.error || !exchange.data.session) {
        throw new Error(exchange.error?.message ?? 'auth_exchange_failed');
      }
      if (
        callback.searchParams.get('mode') === 'recovery'
        || callback.searchParams.get('type') === 'recovery'
      ) {
        router.replace('/reset-password');
        return exchange.data.session;
      }
      await syncSession(exchange.data.session);
      router.replace('/(app)');
      return exchange.data.session;
    })();
    pendingAuthCodes.current.set(code, exchangePromise);

    try {
      return await exchangePromise;
    } finally {
      pendingAuthCodes.current.delete(code);
    }
  }, [syncSession]);

  useEffect(() => {
    let mounted = true;

    const report = (reason: unknown) => {
      if (mounted) setError(authMessage(reason));
    };

    const bootstrap = async () => {
      try {
        const initialUrl = await withTimeout(Linking.getInitialURL());
        if (initialUrl && await acceptAuthUrl(initialUrl)) return;

        const { data } = await withTimeout(supabase.auth.getSession());
        if (data.session && await secureStorage.getItem(BIOMETRIC_KEY) === 'enabled') {
          const authentication = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Desbloquear o Level OS',
            cancelLabel: 'Cancelar',
            disableDeviceFallback: false,
          });
          if (!authentication.success) {
            if (mounted) setError('O acesso biométrico foi cancelado.');
            return;
          }
        }
        if (data.session) {
          await syncSession(data.session);
        } else {
          const phpAuthenticated = await withTimeout(bootstrapPhpSession());
          if (mounted) setAuthenticated(phpAuthenticated);
        }
      } catch (reason) {
        if (mounted) setSession(null);
        if (mounted) setAuthenticated(false);
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
        setSession(null);
        setAuthenticated(false);
        return;
      }
      if (event === 'TOKEN_REFRESHED' && next) {
        void syncSession(next).catch(report);
      }
    });

    return () => {
      mounted = false;
      linking.remove();
      data.subscription.unsubscribe();
    };
  }, [acceptAuthUrl, syncSession]);

  const signUp = useCallback(async (email: string, password: string) => {
    setError(null);
    const result = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { emailRedirectTo: MOBILE_WEB_CALLBACK },
    });
    if (result.error) {
      const message = authMessage(result.error);
      setError(message);
      throw new Error(message);
    }
    if (!result.data.session) return 'confirmation_required';
    try {
      await syncSession(result.data.session);
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
    const result = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: MOBILE_WEB_CALLBACK,
        skipBrowserRedirect: true,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (result.error || !result.data.url) {
      const message = authMessage(result.error ?? new Error('google_oauth_failed'));
      setError(message);
      throw new Error(message);
    }

    const nativeCallback = Linking.createURL('auth/callback');
    const browser = await WebBrowser.openAuthSessionAsync(result.data.url, nativeCallback);
    if (browser.type !== 'success' || !browser.url) {
      const message = authMessage(new Error('google_oauth_cancelled'));
      setError(message);
      throw new Error(message);
    }
    try {
      const authenticated = await acceptAuthUrl(browser.url);
      if (!authenticated) throw new Error('google_oauth_invalid_callback');
    } catch (reason) {
      const message = authMessage(reason);
      setError(message);
      throw new Error(message);
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
      await syncSession(result.data.session, password);
      router.replace('/(app)');
    } catch (reason) {
      const message = authMessage(reason);
      setSession(null);
      setAuthenticated(false);
      setError(message);
      throw new Error(message);
    }
  }, [syncSession]);

  const requestPasswordReset = useCallback(async (email: string) => {
    setError(null);
    const result = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${MOBILE_WEB_CALLBACK}&mode=recovery`,
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
    setSession(null);
    setAuthenticated(false);
    router.replace('/login');
  }, []);

  const signOut = useCallback(async () => {
    await endPhpSession();
    await supabase.auth.signOut();
    setSession(null);
    setAuthenticated(false);
    router.replace('/login');
  }, []);

  const value = useMemo(() => ({
    authenticated,
    loading,
    session,
    error,
    signIn,
    signInWithGoogle,
    signUp,
    requestPasswordReset,
    updatePassword,
    signOut,
  }), [
    authenticated,
    loading,
    session,
    error,
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
