import type { Session } from '@supabase/supabase-js';

import { appConfig } from '@/lib/config';

let csrfToken = '';
const REQUEST_TIMEOUT_MS = 15_000;

type ApiOptions = RequestInit & { bodyJson?: unknown };

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code);
    this.name = 'ApiError';
  }
}

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function decode<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as T | { error?: string } | null;
  if (!response.ok) {
    const code = payload && typeof payload === 'object' && 'error' in payload
      ? String(payload.error)
      : `http_${response.status}`;
    throw new ApiError(code, response.status);
  }
  return payload as T;
}

function supabaseBridgeHeaders(): Record<string, string> {
  return {
    'X-Level-Supabase-Key': appConfig.supabasePublishableKey,
    'X-Level-Supabase-Url': appConfig.supabaseUrl,
  };
}

export async function bootstrapPhpSession(): Promise<boolean> {
  const bootstrap = await fetchWithTimeout(`${appConfig.apiUrl}/api/mobile-session.php`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  const initial = await decode<{ csrf: string; authenticated: boolean }>(bootstrap);
  csrfToken = initial.csrf;
  return initial.authenticated;
}

export async function establishPhpSession(session: Session, localPassword?: string): Promise<void> {
  await bootstrapPhpSession();
  const exchange = await fetchWithTimeout(`${appConfig.apiUrl}/api/mobile-session.php`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      ...supabaseBridgeHeaders(),
    },
    body: JSON.stringify({
      local_password: localPassword || undefined,
    }),
  });
  const authenticated = await decode<{ status: string; csrf: string }>(exchange);
  if (authenticated.status !== 'authenticated') throw new Error(authenticated.status);
  csrfToken = authenticated.csrf;
}

export async function establishLegacyPhpSession(email: string, password: string): Promise<void> {
  await bootstrapPhpSession();
  const response = await fetchWithTimeout(`${appConfig.apiUrl}/api/mobile-session.php`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({
      mode: 'password',
      email: email.trim().toLowerCase(),
      password,
    }),
  });
  const authenticated = await decode<{ status: string; csrf: string }>(response);
  if (authenticated.status !== 'authenticated') throw new Error(authenticated.status);
  csrfToken = authenticated.csrf;
}

export async function endPhpSession(): Promise<void> {
  if (!csrfToken) return;
  await fetchWithTimeout(`${appConfig.apiUrl}/api/mobile-session.php`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'X-CSRF-Token': csrfToken,
    },
  }).catch(() => undefined);
  csrfToken = '';
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.bodyJson !== undefined) {
    headers.set('Content-Type', 'application/json');
    options.body = JSON.stringify(options.bodyJson);
  }
  if (!['GET', 'HEAD'].includes(method)) headers.set('X-CSRF-Token', csrfToken);

  const response = await fetchWithTimeout(`${appConfig.apiUrl}${path}`, {
    ...options,
    method,
    headers,
    credentials: 'include',
  });
  if (response.status === 401) throw new Error('unauthorized');
  return decode<T>(response);
}

export type NativeProfile = {
  username: string;
  email: string | null;
  avatar: string | null;
};

export type SubscriptionState = {
  plan: 'free' | 'individual';
  status: string;
  in_trial: boolean;
  trial_days_left: number;
  paid_access: boolean;
};

export type FinanceAccount = {
  id: string;
  label: string;
  saldo: number;
  fatura?: number;
};

export type FinanceExpense = {
  id: string;
  label: string;
  value: number;
  date?: string | null;
  categoria?: string | null;
};

export type DashboardPayload = {
  accounts_v2?: FinanceAccount[];
  expense_lines_v4?: FinanceExpense[];
  income_lines?: { id: string; label: string; value: number }[];
  tasks_v6?: {
    id: string;
    title?: string;
    label?: string;
    subtitle?: string;
    time?: string;
    completed?: boolean;
  }[];
};
