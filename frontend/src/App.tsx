import { useEffect } from 'react';
import { Cadastro } from './components/Auth/Cadastro';
import { Login } from './components/Auth/Login';
import { Recuperar } from './components/Auth/Recuperar';
import { TwoFactor } from './components/Auth/TwoFactor';
import { Verificacao } from './components/Auth/Verificacao';
import { ModalsContainer } from './components/Dashboard/ModalsContainer';
import { TopNavBar } from './components/Dashboard/TopNavBar';
import { OverviewScreen } from './modules/overview/OverviewScreen';
import { Bloqueada } from './components/Simulation/Bloqueada';
import { Expirada } from './components/Simulation/Expirada';
import { Mapa } from './components/Simulation/Mapa';
import { AppContextProvider, useApp } from './context/AppContext';

const AppRouter = () => {
  const { currentScreen, isSearchOpen, setIsSearchOpen, searchQuery, setSearchQuery } = useApp();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsSearchOpen(false);
      if (event.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        event.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setIsSearchOpen]);

  if (currentScreen === 'login') return <Login />;
  if (currentScreen === 'cadastro') return <Cadastro />;
  if (currentScreen === 'recuperar') return <Recuperar />;
  if (currentScreen === 'verificacao') return <Verificacao />;
  if (currentScreen === '2fa') return <TwoFactor />;
  if (currentScreen === 'expirada') return <Expirada />;
  if (currentScreen === 'bloqueada') return <Bloqueada />;
  if (currentScreen === 'mapa') return <Mapa />;

  return (
    <div id="top" className="min-h-screen bg-background text-on-surface">
      <TopNavBar />
      <OverviewScreen />
      <ModalsContainer />
      {isSearchOpen && (
        <div className="fixed inset-0 z-[120] bg-black/65 p-4 pt-[12vh] backdrop-blur-sm" onMouseDown={() => setIsSearchOpen(false)}>
          <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-[#17191d] p-3 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <label className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-4 py-3">
              <span className="material-symbols-outlined text-[#9ca3af]">search</span>
              <span className="sr-only">Busca global</span>
              <input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Buscar em todo o Orby" className="w-full bg-transparent text-base text-white outline-none placeholder:text-[#737985]" />
              <kbd className="rounded border border-white/10 px-2 py-1 text-[10px] text-[#8b919d]">ESC</kbd>
            </label>
            <p className="px-4 py-5 text-sm text-[#8b919d]">
              {searchQuery ? `Buscando por “${searchQuery}”` : 'Digite para encontrar tarefas, despesas e treinos.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return <AppContextProvider><AppRouter /></AppContextProvider>;
}
