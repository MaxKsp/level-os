import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { appConfig } from '@/lib/config';
import { secureStorage } from '@/lib/secure-storage';

export const supabase = createClient(appConfig.supabaseUrl, appConfig.supabasePublishableKey, {
  auth: {
    storage: secureStorage,
    storageKey: 'level_os_native_auth',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
