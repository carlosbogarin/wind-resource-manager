import React from 'react';
import {
  Wind,
  Layers,
  Database,
  FileSpreadsheet,
  BookOpen,
  ExternalLink,
  X,
  Compass,
  Activity,
  Zap,
} from 'lucide-react';

export type ActiveModule = 'reanalysis' | 'catalog' | 'dossier' | 'methodology';

interface SidebarProps {
  activeModule: ActiveModule;
  onSelectModule: (module: ActiveModule) => void;
  totalEnsembles?: number;
  totalCompanies?: number;
  isOpen?: boolean;
  onClose?: () => void;
  theme?: 'light' | 'dark';
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  totalEnsembles,
  totalCompanies,
  isOpen = false,
  onClose,
  theme = 'dark',
}) => {
  const handleSelect = (module: ActiveModule) => {
    onSelectModule(module);
    if (onClose) onClose();
  };

  const isLight = theme === 'light';

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] ${
        isLight ? 'bg-white border-slate-200' : 'bg-zinc-950 border-zinc-800'
      } border-r flex flex-col justify-between p-4 transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:w-64 lg:translate-x-0 lg:z-30 shrink-0 ${
        isOpen ? 'translate-x-0 shadow-2xl shadow-black/80' : '-translate-x-full'
      }`}
    >
      {/* Top: Logo & Title */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-1 py-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0 text-white font-bold">
              <Wind className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1.5">
                <h1 className={`text-base font-bold tracking-tight leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Wind Resource
                </h1>
                <span className={`text-[10px] font-mono font-medium px-1 py-0.5 rounded leading-none ${
                  isLight ? 'text-cyan-700 bg-cyan-50 border border-cyan-200' : 'text-cyan-400 bg-cyan-950/80 border border-cyan-800/60'
                }`}>
                  v1.4.1
                </span>
              </div>
              <span className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 leading-tight">
                Manager Analytics
              </span>
              <a
                href="https://www.linkedin.com/in/carlosbogarin/"
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 text-[11px] font-medium transition-colors mt-0.5 group ${
                  isLight ? 'text-slate-500 hover:text-cyan-700' : 'text-zinc-400 hover:text-cyan-400'
                }`}
                title="Acessar LinkedIn de Carlos Bogarin"
              >
                <span>By: Carlos Bogarin</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </a>
            </div>
          </div>

          {/* Close button for Mobile Drawer */}
          <button
            onClick={onClose}
            className={`lg:hidden p-1.5 rounded-lg transition-colors ${
              isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            title="Fechar menu lateral"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1.5">
          <div className={`px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>
            Módulos da Plataforma
          </div>

          {/* Module 1: Reanálises (Visão Principal) */}
          <button
            onClick={() => handleSelect('reanalysis')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
              activeModule === 'reanalysis'
                ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-lg shadow-cyan-600/30'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Compass className="w-4 h-4 shrink-0" />
            <div className="flex flex-col">
              <span>Reanálises</span>
              <span className={`text-[10px] font-normal ${activeModule === 'reanalysis' ? 'text-cyan-100' : 'text-zinc-500'}`}>
                ERA5 & MERRA-2 (30 Anos)
              </span>
            </div>
          </button>

          {/* Module 2: Catálogo ONS */}
          <button
            onClick={() => handleSelect('catalog')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
              activeModule === 'catalog'
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-600/30'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Database className="w-4 h-4 shrink-0" />
            <div className="flex flex-col">
              <span>Catálogo ONS</span>
              <span className={`text-[10px] font-normal ${activeModule === 'catalog' ? 'text-emerald-100' : 'text-zinc-500'}`}>
                Parques, Conjuntos & SEs
              </span>
            </div>
          </button>

          {/* Module 3: Dossiê & Exportação */}
          <button
            onClick={() => handleSelect('dossier')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
              activeModule === 'dossier'
                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-600/30'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <div className="flex flex-col">
              <span>Dossiê & Exportação</span>
              <span className={`text-[10px] font-normal ${activeModule === 'dossier' ? 'text-purple-100' : 'text-zinc-500'}`}>
                CSV, Parquet & Sumários
              </span>
            </div>
          </button>

          {/* Module 4: Metodologia */}
          <button
            onClick={() => handleSelect('methodology')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
              activeModule === 'methodology'
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg shadow-amber-600/30'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <div className="flex flex-col">
              <span>Metodologia</span>
              <span className={`text-[10px] font-normal ${activeModule === 'methodology' ? 'text-amber-100' : 'text-zinc-500'}`}>
                Fórmulas, IDW & Malhas
              </span>
            </div>
          </button>
        </nav>
      </div>

      {/* Bottom Summary Badge */}
      <div className={`mt-6 pt-4 border-t ${isLight ? 'border-slate-200' : 'border-zinc-800/80'} space-y-2`}>
        <div className={`p-3 rounded-xl border ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-zinc-900/80 border-zinc-800 text-zinc-300'
        } text-xs space-y-1.5`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-500 font-medium">Bases Carregadas</span>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </div>
          <div className="flex justify-between font-mono text-[11px]">
            <span>Conjuntos:</span>
            <strong className="text-cyan-600 dark:text-cyan-400">{totalEnsembles || 155}</strong>
          </div>
          <div className="flex justify-between font-mono text-[11px]">
            <span>Empresas:</span>
            <strong className="text-emerald-600 dark:text-emerald-400">{totalCompanies || 31}</strong>
          </div>
        </div>

        <p className="text-[10px] text-zinc-500 text-center">
          ECMWF ERA5 & NASA MERRA-2
        </p>
      </div>
    </aside>
  );
};