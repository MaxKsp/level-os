import { useApp } from '../../context/AppContext';

export const TopNavBar = () => {
  const { setIsSearchOpen, setIsExpenseModalOpen, isProfileMenuOpen, setIsProfileMenuOpen, setCurrentScreen } = useApp();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.07] bg-[#0c0d10]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <button onClick={() => setCurrentScreen('dashboard')} className="flex items-center gap-2 text-white" aria-label="Ir para o início">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#b8c8ff] text-[#172348]">
              <span className="material-symbols-outlined text-[19px]" style={{ fontVariationSettings: "'FILL' 1" }}>orbit</span>
            </span>
            <span className="text-lg font-semibold tracking-[-0.03em]">Orby</span>
          </button>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação principal">
            <button className="rounded-lg bg-white/[0.07] px-3 py-2 text-sm font-medium text-white">Visão geral</button>
            <button onClick={() => setIsExpenseModalOpen(true)} className="rounded-lg px-3 py-2 text-sm font-medium text-[#969ca8] hover:bg-white/[0.04] hover:text-white">Finanças</button>
            <button className="rounded-lg px-3 py-2 text-sm font-medium text-[#969ca8] hover:bg-white/[0.04] hover:text-white">Rotina</button>
            <button className="rounded-lg px-3 py-2 text-sm font-medium text-[#969ca8] hover:bg-white/[0.04] hover:text-white">Treinos</button>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsSearchOpen(true)} className="hidden items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-[#969ca8] hover:bg-white/[0.06] hover:text-white sm:flex">
            <span className="material-symbols-outlined text-[18px]">search</span><span>Buscar</span><kbd className="ml-3 text-[10px]">/</kbd>
          </button>
          <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="grid h-10 w-10 place-items-center rounded-full bg-[#242832] text-sm font-semibold text-[#dce3ff]" aria-label="Abrir menu do perfil">LS</button>
          {isProfileMenuOpen && (
            <div className="absolute right-4 top-14 w-56 rounded-xl border border-white/10 bg-[#17191d] p-2 shadow-2xl">
              <div className="border-b border-white/[0.07] px-3 py-2"><p className="text-sm font-medium text-white">Lucas Silva</p><p className="text-xs text-[#858b96]">lucas@orby.com.br</p></div>
              <button onClick={() => setCurrentScreen('mapa')} className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-[#a6acb7] hover:bg-white/[0.05]">Mapa de telas</button>
              <button onClick={() => setCurrentScreen('login')} className="w-full rounded-lg px-3 py-2 text-left text-sm text-[#ffb4ab] hover:bg-white/[0.05]">Sair</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
