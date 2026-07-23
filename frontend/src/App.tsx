import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BottomNav } from './components/Dashboard/BottomNav';
import { TopNavBar } from './components/Dashboard/TopNavBar';
import { AppContextProvider, useApp } from './context/AppContext';
import { FinanceProvider } from './modules/finance/store';
import { TrainingProvider } from './modules/training/store';
import { ShaderBackground } from './components/ui/ShaderBackground';
import { ProgressProvider } from './modules/progress/store';
import { LevelUpOverlay } from './modules/progress/components/LevelUpOverlay';
import { XpFeedback } from './modules/progress/components/XpFeedback';
import { SubscriptionProvider, useSubscription } from './modules/subscription/store';
import { ExpiredPaywall } from './modules/subscription/ExpiredPaywall';
import { IdentityProvider } from './modules/identity/store';
import { PreferencesProvider } from './modules/preferences/store';
import { TrialBanner } from './modules/subscription/TrialBanner';
import { CalendarProvider } from './modules/calendar/store';
import { AssistantProvider } from './modules/assistant/store';
import { NutritionProvider } from './modules/nutrition/store';
import { useAssistant } from './modules/assistant/store';
import { usePreferences } from './modules/preferences/store';
import { SearchProvider, useSearch } from './modules/search/store';

const ModalsContainer = lazy(() => import('./components/Dashboard/ModalsContainer').then((module) => ({ default: module.ModalsContainer })));
const OverviewScreen = lazy(() => import('./modules/overview/OverviewScreen').then((module) => ({ default: module.OverviewScreen })));
const FinanceScreen = lazy(() => import('./modules/finance/FinanceScreen').then((module) => ({ default: module.FinanceScreen })));
const ProfileScreen = lazy(() => import('./modules/profile/ProfileScreen').then((module) => ({ default: module.ProfileScreen })));
const RoutineScreen = lazy(() => import('./modules/routine/RoutineScreen').then((module) => ({ default: module.RoutineScreen })));
const TrainingScreen = lazy(() => import('./modules/training/TrainingScreen').then((module) => ({ default: module.TrainingScreen })));
const NutritionScreen = lazy(() => import('./modules/nutrition/NutritionScreen').then((module) => ({ default: module.NutritionScreen })));
const FirstLoginOnboarding = lazy(() => import('./modules/onboarding/FirstLoginOnboarding').then((module) => ({ default: module.FirstLoginOnboarding })));
const AssistantCommand = lazy(() => import('./modules/assistant/AssistantCommand').then((module) => ({ default: module.AssistantCommand })));

function PageFallback() {
  return <main className="level-page mx-auto max-w-[1180px] px-4 pb-24 pt-24 sm:px-6" aria-busy="true" aria-label="Carregando página">
    <div className="h-9 w-52 animate-pulse rounded-lg bg-surface-container-high" />
    <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-surface-container" />
    <div className="mt-8 grid gap-4 md:grid-cols-2"><div className="h-52 animate-pulse rounded-2xl bg-surface-container" /><div className="h-52 animate-pulse rounded-2xl bg-surface-container" /></div>
  </main>;
}

function AppRoutes() {
  const location = useLocation();
  const { subscription, status } = useSubscription();
  const app = useApp();
  const assistant = useAssistant();
  const search = useSearch();
  const preferences = usePreferences();
  const setAssistantOpen = assistant.setOpen;
  const setSearchOpen = search.setIsOpen;
  const [assistantUiLoaded, setAssistantUiLoaded] = useState(false);
  const [modalUiLoaded, setModalUiLoaded] = useState(false);
  const blocked = status === 'ready' && !subscription.access;
  const urgentTrial = status === 'ready' && subscription.in_trial && subscription.trial_days_left <= 5;
  const modalUiOpen = search.isOpen || app.isTaskModalOpen || app.isExpenseModalOpen || app.isWeightModalOpen || app.isWorkoutModalOpen;
  const showOnboarding = preferences.status !== 'loading' && !preferences.onboarding_completed;

  useEffect(() => {
    if (assistant.open || assistant.result) setAssistantUiLoaded(true);
  }, [assistant.open, assistant.result]);

  useEffect(() => {
    if (modalUiOpen) setModalUiLoaded(true);
  }, [modalUiOpen]);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      const editable = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || (event.target instanceof HTMLElement && event.target.isContentEditable);
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !editable) {
        event.preventDefault();
        setAssistantOpen(true);
      } else if (event.key === '/' && !editable) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, [setAssistantOpen, setSearchOpen]);

  return <div id="top" className={`level-app-shell min-h-screen bg-background text-on-surface${urgentTrial ? ' level-trial-active' : ''}`}>
    <ShaderBackground opacity={0.2} />
    <div className="level-app-content">
      <TopNavBar />
      <div className="level-app-main min-h-screen transition-[padding] duration-200 motion-reduce:transition-none md:pl-[var(--level-sidebar-width)]">
        {!blocked ? <TrialBanner /> : null}
        {blocked ? <ExpiredPaywall /> : <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <Suspense fallback={<PageFallback />}>
              <Routes location={location}>
                <Route path="/" element={<OverviewScreen />} />
                <Route path="/financeiro" element={<FinanceScreen />} />
                <Route path="/agenda" element={<RoutineScreen />} />
                <Route path="/treinos" element={<TrainingScreen />} />
                <Route path="/alimentacao" element={<NutritionScreen />} />
                <Route path="/perfil" element={<ProfileScreen />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </motion.div>
        </AnimatePresence>}
      </div>
      {!blocked ? <BottomNav /> : null}
      {!blocked && (modalUiLoaded || modalUiOpen) ? <Suspense fallback={null}><ModalsContainer /></Suspense> : null}
      {!blocked ? <LevelUpOverlay /> : null}
      {!blocked ? <XpFeedback /> : null}
      {!blocked && (assistantUiLoaded || assistant.open || Boolean(assistant.result)) ? <Suspense fallback={null}><AssistantCommand /></Suspense> : null}
      {!blocked && showOnboarding ? <Suspense fallback={null}><FirstLoginOnboarding /></Suspense> : null}
    </div>
  </div>;
}

export default function App() {
  return <MotionConfig reducedMotion="user">
    <IdentityProvider>
      <PreferencesProvider>
        <SubscriptionProvider>
          <ProgressProvider>
            <AppContextProvider>
              <SearchProvider>
                <CalendarProvider>
                  <FinanceProvider>
                    <TrainingProvider>
                      <NutritionProvider>
                        <AssistantProvider><AppRoutes /></AssistantProvider>
                      </NutritionProvider>
                    </TrainingProvider>
                  </FinanceProvider>
                </CalendarProvider>
              </SearchProvider>
            </AppContextProvider>
          </ProgressProvider>
        </SubscriptionProvider>
      </PreferencesProvider>
    </IdentityProvider>
  </MotionConfig>;
}
