import './lib/storageMigration';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import '@fontsource-variable/geist';
import './index.css';
import { applyTheme, getStoredTheme } from './lib/theme';
import { clearUnscopedUserStorage } from './lib/userStorage';

declare global {
  interface Window {
    LEVEL_OS_SENTRY_DSN?: string | null;
  }
}

// Aplica o tema antes do render para não piscar (FOUC de tema).
clearUnscopedUserStorage();
applyTheme(getStoredTheme());

if (window.LEVEL_OS_SENTRY_DSN) {
  Sentry.init({
    dsn: window.LEVEL_OS_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,
  });
}

if (window.LEVEL_OS_AUTH_CONFIG) {
  void import('./auth/supabaseClient').then(({ startSupabaseSessionBridge }) => startSupabaseSessionBridge());
}

// BrowserRouter mantém as rotas públicas limpas. Vite aplica o fallback em
// desenvolvimento e o .htaccess limita o fallback às cinco rotas do React.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
