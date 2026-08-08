import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence, LazyMotion, MotionConfig } from 'motion/react';
import * as m from 'motion/react-m';
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
import { NativeSecurityGate } from './modules/native/NativeSecurityGate';
import { NativePushBridge } from './modules/native/NativePushBridge';
import { FinanceUndoToast } from './modules/finance/FinanceUndoToast';
import { loadFinance, loadNutrition, loadOverview, loadProfile, loadRoutine, loadTraining } from './app/routeLoaders';

const loadMotionFeatures = () => import('./app/motionFeatures').then((module) => module.default);

const ModalsContainer = lazy(() => import('./components/Dashboard/ModalsContainer').then((module) => ({ default: module.ModalsContainer })));
const OverviewScreen = lazy(() => loadOverview().then((module) => ({ default: module.OverviewScreen as typeof import('./modules/overview/OverviewScreen').OverviewScreen })));
const FinanceScreen = lazy(() => loadFinance().then((module) => ({ default: module.FinanceScreen as typeof import('./modules/finance/FinanceScreen').FinanceScreen })));
const ProfileScreen = lazy(() => loadProfile().then((module) => ({ default: module.ProfileScreen as typeof import('./modules/profile/ProfileScreen').ProfileScreen })));
const RoutineScreen = lazy(() => loadRoutine().then((module) => ({ default: module.RoutineScreen as typeof import('./modules/routine/RoutineScreen').RoutineScreen })));
const TrainingScreen = lazy(() => loadTraining().then((module) => ({ default: module.TrainingScreen as typeof import('./modules/training/TrainingScreen').TrainingScreen })));
const NutritionScreen = lazy(() => loadNutrition().then((module) => ({ default: module.NutritionScreen as typeof import('./modules/nutrition/NutritionScreen').NutritionScreen })));
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
    <a href="#level-main-content" className="level-skip-link">Pular para o conteúdo</a>
    <ShaderBackground opacity={0.2} />
    <div className="level-app-content">
      <TopNavBar />
      <div id="level-main-content" tabIndex={-1} className="level-app-main min-h-screen scroll-mt-20 transition-[padding] duration-200 outline-none motion-reduce:transition-none md:pl-[var(--level-sidebar-width)]">
        {!blocked ? <TrialBanner /> : null}
        {blocked ? <ExpiredPaywall /> : <AnimatePresence mode="wait" initial={false}>
          <m.div
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
          </m.div>
        </AnimatePresence>}
      </div>
      {!blocked ? <BottomNav /> : null}
      {!blocked && (modalUiLoaded || modalUiOpen) ? <Suspense fallback={null}><ModalsContainer /></Suspense> : null}
      {!blocked ? <LevelUpOverlay /> : null}
      {!blocked ? <XpFeedback /> : null}
      {!blocked ? <FinanceUndoToast /> : null}
      {!blocked && (assistantUiLoaded || assistant.open || Boolean(assistant.result)) ? <Suspense fallback={null}><AssistantCommand /></Suspense> : null}
      {!blocked && showOnboarding ? <Suspense fallback={null}><FirstLoginOnboarding /></Suspense> : null}
    </div>
  </div>;
}

export default function App() {
  return <MotionConfig reducedMotion="user">
    <LazyMotion features={loadMotionFeatures} strict>
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
                        <AssistantProvider>
                          <NativeSecurityGate>
                            <NativePushBridge />
                            <AppRoutes />
                          </NativeSecurityGate>
                        </AssistantProvider>
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
    </LazyMotion>
  </MotionConfig>;
}
