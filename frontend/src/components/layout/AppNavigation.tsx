import { useState } from 'react';
import { useOptionalBootstrap } from '../../app/BootstrapProvider';
import { RouterLink, type AppPath } from '../../app/router';

const destinations: { path: AppPath; label: string; icon: string }[] = [
  { path: '/', label: 'Visão geral', icon: 'home' },
  { path: '/agenda', label: 'Agenda', icon: 'calendar_month' },
  { path: '/financeiro', label: 'Financeiro', icon: 'account_balance_wallet' },
  { path: '/treinos', label: 'Treinos', icon: 'fitness_center' },
  { path: '/perfil', label: 'Perfil', icon: 'person' },
];

function initials(name?: string) {
  return (name || 'Orby').trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

export function AppNavigation({ path, onSearch }: { path: AppPath; onSearch: () => void }) {
  const bootstrap = useOptionalBootstrap();
  const data = bootstrap?.data;
  const demo = bootstrap?.demo ?? false;
  const [profileOpen, setProfileOpen] = useState(false);

  return <>
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.07] bg-[#0c0d10]/95 backdrop-blur-xl">
      <div className="relative mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-7">
          <RouterLink to="/" className="flex shrink-0 items-center gap-2 text-white">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-on-primary"><span className="material-symbols-outlined text-[19px]">orbit</span></span>
            <span className="text-lg font-semibold tracking-tight">Orby</span>
          </RouterLink>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação principal">
            {destinations.map((item) => <RouterLink key={item.path} to={item.path} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${path === item.path ? 'bg-white/[0.08] text-white' : 'text-on-surface-variant hover:bg-white/[0.04] hover:text-white'}`}><span aria-current={path === item.path ? 'page' : undefined}>{item.label}</span></RouterLink>)}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {demo && <span className="hidden rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning sm:inline">Modo demonstração</span>}
          <button onClick={onSearch} className="flex h-10 items-center gap-2 rounded-xl px-3 text-on-surface-variant transition-colors hover:bg-white/[0.06] hover:text-white" aria-label="Abrir busca">
            <span className="material-symbols-outlined text-[20px]">search</span><span className="hidden text-sm sm:inline">Buscar</span><kbd className="hidden rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-muted lg:inline">/</kbd>
          </button>
          <div className="relative">
            <button onClick={() => setProfileOpen((open) => !open)} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-surface-container-high text-xs font-semibold text-on-surface hover:border-primary/50" aria-label="Abrir menu do perfil" aria-expanded={profileOpen}>
              {initials(data?.profile.username)}
            </button>
            {profileOpen && <div className="absolute right-0 top-12 w-64 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low shadow-2xl">
              <div className="border-b border-outline-variant px-4 py-3"><p className="truncate text-sm font-medium text-on-surface">{data?.profile.username || 'Conta Orby'}</p><p className="truncate text-xs text-muted">{data?.profile.email || 'Carregando perfil…'}</p></div>
              <RouterLink to="/perfil" onNavigate={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-on-surface-variant hover:bg-white/[0.04] hover:text-white"><span className="material-symbols-outlined text-[19px]">manage_accounts</span>Perfil e segurança</RouterLink>
              <a href="/logout.php" className="flex items-center gap-3 px-4 py-3 text-sm text-on-surface-variant hover:bg-white/[0.04] hover:text-white"><span className="material-symbols-outlined text-[19px]">logout</span>Sair</a>
            </div>}
          </div>
        </div>
      </div>
    </header>

    <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-white/[0.08] bg-[#0c0d10]/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label="Navegação mobile">
      {destinations.map((item) => <RouterLink key={item.path} to={item.path} className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] ${path === item.path ? 'text-primary' : 'text-muted'}`}><span className="material-symbols-outlined text-[21px]" aria-hidden="true">{item.icon}</span><span aria-current={path === item.path ? 'page' : undefined}>{item.label}</span></RouterLink>)}
    </nav>
  </>;
}
