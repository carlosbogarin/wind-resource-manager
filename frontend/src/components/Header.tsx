import React from 'react';
import { Activity, Sun, Moon, Menu } from 'lucide-react';
import { ActiveModule } from './Sidebar';

interface HeaderProps {
  activeModule?: ActiveModule;
  activeEnsembleName?: string;
  theme: 'light' | 'dark';
  onToggleTheme: (theme: 'light' | 'dark') => void;
  onToggleSidebar?: () => void;
}

const MODULE_METADATA: Record<
  ActiveModule,
  {
    title: string;
    description: string;
  }
> = {
  reanalysis: {
    title: 'Reanálises - ONS',
    description: 'Séries Históricas de 30 Anos • ERA5 (0.25°) & MERRA-2 (0.5°x0.625°)',
  },
  reanalysis_manual: {
    title: 'Reanálises - Manual',
    description: 'Coordenadas Geográficas Alvo & Extrapolação Horizontal Geodésica',
  },

  methodology: {
    title: 'Metodologia',
    description: 'Formulação Matemática, Padrões Normativos (WMO/IEC) & Malhas de Reanálise',
  },
};

export const Header: React.FC<HeaderProps> = ({
  activeModule = 'reanalysis',
  activeEnsembleName,
  theme,
  onToggleTheme,
  onToggleSidebar,
}) => {
  const isLight = theme === 'light';
  const metadata = MODULE_METADATA[activeModule] || MODULE_METADATA.reanalysis;

  return (
    <header className={`border-b ${
      isLight ? 'border-slate-200 bg-white/90' : 'border-zinc-800 bg-zinc-900/80'
    } backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3 shadow-sm`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Mobile Menu Trigger & Title / Active Info */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className={`lg:hidden p-2 rounded-xl border transition-colors ${
              isLight
                ? 'border-slate-200 hover:bg-slate-100 text-slate-700'
                : 'border-zinc-800 hover:bg-zinc-800 text-zinc-300'
            }`}
            title="Abrir menu lateral"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-base sm:text-lg font-bold tracking-tight flex items-center gap-2 ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                <span>{metadata.title}</span>
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
              <span>{metadata.description}</span>
            </p>
          </div>
        </div>

        {/* Right: Active Ensemble & Theme Switcher */}
        <div className="flex items-center gap-2.5">
          {activeEnsembleName && activeModule === 'reanalysis' && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
              <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
              <span>Conjunto: <strong>{activeEnsembleName}</strong></span>
            </div>
          )}

          {/* Seletor de Tema (Pílula Light / Dark) no padrão ouro do Smart Curtailment */}
          <div className={`flex items-center p-1 rounded-xl border shadow-inner ${
            isLight ? 'bg-slate-100 border-slate-300' : 'bg-zinc-900 border-zinc-700/80'
          }`}>
            <button
              type="button"
              onClick={() => onToggleTheme('light')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                theme === 'light'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Alternar para Modo Claro (Light Mode)"
              aria-label="Modo Claro"
            >
              <Sun className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-slate-950' : 'text-amber-400'}`} />
              <span className="hidden sm:inline">Claro</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleTheme('dark')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                theme === 'dark'
                  ? 'bg-blue-600 text-white shadow-md font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Alternar para Modo Escuro (Dark Mode)"
              aria-label="Modo Escuro"
            >
              <Moon className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-white' : 'text-blue-400'}`} />
              <span className="hidden sm:inline">Escuro</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};