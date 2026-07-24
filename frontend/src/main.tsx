import './lib/storageMigration';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App.tsx';
import '@fontsource-variable/geist';
import './index.css';
import { applyTheme, getStoredTheme } from './lib/theme';
import { clearSensitiveBrowserCaches, clearUnscopedUserStorage } from './lib/userStorage';
import { loadRuntimeConfigFromMeta } from './lib/runtimeConfig';

// Aplica o tema antes do render para não piscar (FOUC de tema).
loadRuntimeConfigFromMeta();
clearUnscopedUserStorage();
clearSensitiveBrowserCaches();
applyTheme(getStoredTheme());

if (window.LEVEL_OS_SENTRY_DSN) {
  // Erros muito iniciais ficam em uma fila pequena enquanto o SDK carrega
  // depois do evento load, sem disputar banda/CPU com a primeira pintura.
  const earlyErrors: unknown[] = [];
  const remember = (error: unknown) => { if (earlyErrors.length < 10) earlyErrors.push(error); };
  const rememberError = (event: ErrorEvent) => remember(event.error ?? event.message);
  const rememberRejection = (event: PromiseRejectionEvent) => remember(event.reason);
  window.addEventListener('error', rememberError);
  window.addEventListener('unhandledrejection', rememberRejection);

  const initializeMonitoring = () => {
    void import('@sentry/react').then((Sentry) => {
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
      earlyErrors.splice(0, 10).forEach((error) => Sentry.captureException(error));
      window.removeEventListener('error', rememberError);
      window.removeEventListener('unhandledrejection', rememberRejection);
    });
  };

  if (document.readyState === 'complete') initializeMonitoring();
  else window.addEventListener('load', initializeMonitoring, { once: true });
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
