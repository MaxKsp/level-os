import type { Session } from '@supabase/supabase-js';

import { appConfig } from '@/lib/config';
import { secureStorage } from '@/lib/secure-storage';

let csrfToken = '';
let mobileSessionToken: string | null | undefined;
const REQUEST_TIMEOUT_MS = 15_000;
const MOBILE_SESSION_STORAGE_KEY = 'level_os_mobile_session';
const NATIVE_CLIENT_HEADER = 'level-os-mobile-v1';

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

async function readMobileSessionToken(): Promise<string | null> {
  if (mobileSessionToken !== undefined) return mobileSessionToken;
  mobileSessionToken = await secureStorage.getItem(MOBILE_SESSION_STORAGE_KEY);
  return mobileSessionToken;
}

async function persistMobileSessionToken(token: string): Promise<void> {
  mobileSessionToken = token;
  await secureStorage.setItem(MOBILE_SESSION_STORAGE_KEY, token);
}

async function nativeSessionHeaders(): Promise<Record<string, string>> {
  const token = await readMobileSessionToken();
  return {
    'X-Level-Native-Client': NATIVE_CLIENT_HEADER,
    ...(token ? { 'X-Level-Mobile-Session': token } : {}),
  };
}

export async function bootstrapPhpSession(): Promise<boolean> {
  const bootstrap = await fetchWithTimeout(`${appConfig.apiUrl}/api/mobile-session.php`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...await nativeSessionHeaders(),
    },
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
      ...await nativeSessionHeaders(),
    },
    body: JSON.stringify({
      local_password: localPassword || undefined,
    }),
  });
  const authenticated = await decode<{
    status: string;
    csrf: string;
    mobile_token?: string;
  }>(exchange);
  if (authenticated.status !== 'authenticated') throw new Error(authenticated.status);
  csrfToken = authenticated.csrf;
  if (authenticated.mobile_token) {
    await persistMobileSessionToken(authenticated.mobile_token);
  }
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
      ...await nativeSessionHeaders(),
    },
    body: JSON.stringify({
      mode: 'password',
      email: email.trim().toLowerCase(),
      password,
    }),
  });
  const authenticated = await decode<{
    status: string;
    csrf: string;
    mobile_token?: string;
  }>(response);
  if (authenticated.status !== 'authenticated') throw new Error(authenticated.status);
  csrfToken = authenticated.csrf;
  if (authenticated.mobile_token) {
    await persistMobileSessionToken(authenticated.mobile_token);
  }
}

export async function endPhpSession(): Promise<void> {
  await fetchWithTimeout(`${appConfig.apiUrl}/api/mobile-session.php`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'X-CSRF-Token': csrfToken,
      ...await nativeSessionHeaders(),
    },
  }).catch(() => undefined);
  csrfToken = '';
  mobileSessionToken = null;
  await secureStorage.removeItem(MOBILE_SESSION_STORAGE_KEY);
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
  const nativeHeaders = await nativeSessionHeaders();
  Object.entries(nativeHeaders).forEach(([name, value]) => headers.set(name, value));

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
  totp_enabled: boolean;
  has_password: boolean;
  auth_provider: 'supabase' | null;
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
  'ifood-entries'?: VariableIncome[];
  vaults?: Vault[];
  transfers?: Transfer[];
  bank_favorites?: string[];
  tasks_v6?: {
    id: string;
    title?: string;
    label?: string;
    subtitle?: string;
    time?: string;
    completed?: boolean;
  }[];
};

export type FinanceAccountFull = FinanceAccount & {
  tipo: 'conta' | 'poupanca' | 'pagamento' | 'carteira' | 'cartao' | string;
  chequeEspecial: number;
  limite: number;
  fechamento: number | null;
  vencimento: number | null;
  bank: string | null;
  principal: boolean;
  createdAt: number | null;
};

export type FinanceExpenseFull = FinanceExpense & {
  time: string | null;
  recorrencia: 'none' | 'mensal' | null;
  method: string | null;
  bank: string | null;
  accountId: string | null;
  parcelas: number | null;
  createdAt: number | null;
};

export type FinanceIncome = {
  id: string;
  label: string;
  value: number;
  type: 'fixa' | 'variavel' | 'temporaria' | 'momentanea' | 'avulso' | null;
  date?: string | null;
  endDate: string | null;
  payday: number | null;
  accountId: string | null;
  createdAt: number | null;
  salaryDetails?: Record<string, unknown> | null;
};

export type VariableIncome = {
  id?: string;
  date: string | null;
  valor: number;
  km: number | null;
  label?: string | null;
  accountId?: string | null;
  source?: string;
};

export type Vault = {
  id: string;
  label: string;
  saldo: number;
  meta?: number | null;
};

export type Transfer = {
  id: string;
  value: number;
  date: string | null;
  from?: string | null;
  to?: string | null;
};

export type RoutineTask = {
  id: string;
  time: string;
  title: string;
  subtitle: string;
  completed: boolean;
  date?: string;
  priority?: 'alta' | 'media' | 'baixa';
  category?: string;
  durationMin?: number;
  repeat?: 'none' | 'daily' | 'weekdays' | 'weekly' | 'custom';
  repeatDays?: number[];
  repeatUntil?: string;
  completedDates?: string[];
  excludedDates?: string[];
  reminderMinutes?: number[];
  paused?: boolean;
  sourceScheduleId?: string;
};

export type ProgressAchievement = {
  code: string;
  title: string;
  description: string;
  xp_bonus: number;
  icon: string;
  unlocked: boolean;
  unlocked_at: string | null;
  category: string;
  current: number;
  goal: number;
};

export type ProgressState = {
  level: number;
  title: string;
  xp: number;
  xp_into_level: number;
  xp_to_next: number;
  progress_pct: number;
  streak: number;
  achievements: ProgressAchievement[];
  updated_at: string | null;
};

export type ProfileDetails = {
  phone: string;
  city: string;
  bio: string;
  sex: string;
  birthDate: string;
};

export type Preferences = {
  theme: 'dark' | 'light';
  notifications: { tasks: boolean; finance: boolean; backup: boolean };
  notify_email: boolean;
  onboarding_completed: boolean;
};

export type ActivityEvent = {
  event_type: string;
  outcome: string;
  ip_address?: string | null;
  created_at: string;
};

export type CalendarConnection = {
  status: 'connected' | 'disconnected' | 'reconnect_required';
  accountEmail: string | null;
  connectedAt: string | null;
  syncedAt: string | null;
};

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
  htmlLink: string | null;
};

export async function saveDataKey(key: string, value: unknown): Promise<void> {
  await apiRequest('/api/data.php', {
    method: 'POST',
    bodyJson: { key, value },
  });
}

export async function saveFinanceSet(
  key: 'accounts_v2' | 'income_lines' | 'expense_lines_v4' | 'ifood-entries',
  value: unknown[],
): Promise<void> {
  await apiRequest('/api/finance.php', {
    method: 'POST',
    bodyJson: { key, value },
  });
}

export async function trainingMutation<T>(
  operation: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const response = await apiRequest<{ ok: true; result: T }>('/api/training.php', {
    method: 'POST',
    bodyJson: { operation, ...payload },
  });
  return response.result;
}

export async function nutritionMutation(
  operation: 'archive_active' | 'restore_plan',
  id?: string,
): Promise<void> {
  await apiRequest('/api/nutrition.php', {
    method: 'POST',
    bodyJson: { operation, id },
  });
}

export const loadProgress = () => apiRequest<ProgressState>('/api/progress.php');
export const loadProfileDetails = () => apiRequest<ProfileDetails>('/api/profile.php');
export const saveProfileDetails = (profile: ProfileDetails) =>
  apiRequest<ProfileDetails>('/api/profile.php', { method: 'POST', bodyJson: profile });
export const loadPreferences = () => apiRequest<Preferences>('/api/prefs.php');
export const savePreferences = (preferences: Preferences) =>
  apiRequest<Preferences>('/api/prefs.php', { method: 'POST', bodyJson: preferences });
export const loadActivity = async () => {
  const result = await apiRequest<{ events?: ActivityEvent[] }>('/api/activity.php');
  return Array.isArray(result.events) ? result.events : [];
};

export type TotpEnrollment = {
  secret: string;
  otpauth_uri: string;
};

export const enrollTotp = () =>
  apiRequest<TotpEnrollment>('/api/totp-enroll.php', { method: 'POST', bodyJson: {} });

export const confirmTotp = async (code: string) => {
  const result = await apiRequest<{ ok: true; backup_codes?: string[] }>(
    '/api/totp-confirm.php',
    { method: 'POST', bodyJson: { code } },
  );
  return Array.isArray(result.backup_codes) ? result.backup_codes : [];
};

export const disableTotp = (password: string) =>
  apiRequest<{ ok: true }>('/api/totp-disable.php', {
    method: 'POST',
    bodyJson: { password },
  });

export async function downloadBackup(): Promise<string> {
  const response = await fetchWithTimeout(`${appConfig.apiUrl}/api/export.php`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...await nativeSessionHeaders(),
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null) as { error?: string } | null;
    throw new ApiError(error?.error || `http_${response.status}`, response.status);
  }
  return response.text();
}

export async function restoreBackup(raw: string): Promise<void> {
  await apiRequest<{ ok: true }>('/api/import.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Confirm-Restore': 'replace',
    },
    body: raw,
  });
}

export async function loadCalendar(start?: string, end?: string): Promise<{
  connection: CalendarConnection;
  events: CalendarEvent[];
}> {
  const query = start && end
    ? `?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
    : '';
  return apiRequest(`/api/calendar.php${query}`);
}

export async function disconnectCalendar(): Promise<CalendarConnection> {
  const result = await apiRequest<{ connection: CalendarConnection }>(
    '/api/calendar-disconnect.php',
    { method: 'POST', bodyJson: {} },
  );
  return result.connection;
}

export type PaymentMethod = 'pix' | 'card';
export type SubscriptionPayment = {
  provider: 'mercadopago';
  method: PaymentMethod;
  external_id: string;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  checkout_url: string;
  payment_code: string;
  qr_code_data: string;
  expires_at: string | null;
  amount_cents: number;
  recurring: boolean;
  test_mode: boolean;
};

export async function createSubscriptionCheckout(
  method: PaymentMethod,
): Promise<SubscriptionPayment> {
  const result = await apiRequest<{ payment: SubscriptionPayment }>(
    '/api/subscription-checkout.php',
    { method: 'POST', bodyJson: { plan: 'individual', method } },
  );
  return result.payment;
}

export async function uploadOfx(asset: {
  uri: string;
  name: string;
  mimeType?: string | null;
}): Promise<Record<string, unknown>[]> {
  const form = new FormData();
  form.append('ofx', {
    uri: asset.uri,
    name: asset.name,
    type: asset.mimeType || 'application/x-ofx',
  } as unknown as Blob);
  return apiRequest<{ rows?: Record<string, unknown>[] }>('/api/import-ofx.php', {
    method: 'POST',
    body: form,
  }).then((result) => Array.isArray(result.rows) ? result.rows : []);
}

export async function uploadAvatar(asset: {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}): Promise<string> {
  const form = new FormData();
  form.append('avatar', {
    uri: asset.uri,
    name: asset.fileName || 'avatar.jpg',
    type: asset.mimeType || 'image/jpeg',
  } as unknown as Blob);
  const result = await apiRequest<{ avatar: string }>('/api/avatar.php', {
    method: 'POST',
    body: form,
  });
  return result.avatar;
}
