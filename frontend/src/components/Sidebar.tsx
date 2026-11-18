import React, { useState, useEffect, useRef } from 'react';
import {
  Wind,
  BookOpen,
  ExternalLink,
  X,
  Compass,
  MapPin,
  Radio,
  ChevronLeft,
} from 'lucide-react';

export type ActiveModule = 'reanalysis' | 'reanalysis_manual' | 'met_mast' | 'methodology';

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
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const collapseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-retração temporal inicial (se retrai após 6 segundos de inatividade)
  useEffect(() => {
    collapseTimerRef.current = setTimeout(() => {
      setIsCollapsed(true);
    }, 6000);

    return () => {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    };
  }, []);

  // Ao passar o mouse, cancela o timer e se estende imediatamente
  const handleMouseEnter = () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
    setIsCollapsed(false);
  };

  // Ao retirar o mouse, agenda retração automática após 4 segundos
  const handleMouseLeave = () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
    }
    collapseTimerRef.current = setTimeout(() => {
      setIsCollapsed(true);
    }, 4000);
  };

  // Ao clicar na barra lateral retraída, expande imediatamente
  const handleSidebarClick = () => {
    if (isCollapsed) {
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
        collapseTimerRef.current = null;
      }
      setIsCollapsed(false);
    }
  };

  const handleSelect = (module: ActiveModule) => {
    onSelectModule(module);
    if (onClose) onClose();
  };

  const isLight = theme === 'light';

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleSidebarClick}
      className={`fixed inset-y-0 left-0 z-50 ${
        isCollapsed ? 'lg:w-20' : 'lg:w-64'
      } w-72 max-w-[85vw] ${
        isLight ? 'bg-white border-slate-200' : 'bg-zinc-950 border-zinc-800'
      } border-r flex flex-col justify-between ${
        isCollapsed ? 'px-2.5 py-4' : 'px-3.5 py-4'
      } transition-all duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:translate-x-0 lg:z-30 shrink-0 ${
        isOpen ? 'translate-x-0 shadow-2xl shadow-black/80' : '-translate-x-full'
      }`}
    >
      {/* Top: Logo & Title */}
      <div className="space-y-5">
        <div className={`flex items-center ${isCollapsed ? 'justify-center h-11' : 'justify-between'} px-0.5`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'} w-full min-w-0`}>
            {/* Logo Icon */}
            <div
              className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0 text-white font-bold cursor-pointer transition-transform hover:scale-105"
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed(!isCollapsed);
              }}
              title={isCollapsed ? 'Clique para expandir' : 'Wind Resource Manager'}
            >
              <Wind className="w-6 h-6" />
            </div>

            {/* Title & Author (Hidden when collapsed) - Padrão Smart Curtailment */}
            {!isCollapsed && (
              <div className="flex flex-col min-w-0 flex-1">
                {/* Linha 1: Wind + Badge de Versão */}
                <div className="flex items-center justify-between gap-1.5">
                  <h1 className={`text-sm font-bold tracking-tight leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Wind
                  </h1>
                  <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded shrink-0 leading-none ${
                    isLight ? 'text-cyan-700 bg-cyan-50 border border-cyan-200' : 'text-cyan-400 bg-cyan-950/80 border border-cyan-800/60'
                  }`}>
                    v2.0.0
                  </span>
                </div>

                {/* Linha 2: Resource Manager */}
                <div className={`text-sm font-bold tracking-tight leading-tight ${isLight ? 'text-slate-900' : 'text-white'} whitespace-nowrap`}>
                  Resource Manager
                </div>

                {/* Linha 3: Autor */}
                <a
                  href="https://www.linkedin.com/in/carlosbogarin/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 text-[11px] font-medium transition-colors mt-0.5 group ${
                    isLight ? 'text-slate-500 hover:text-cyan-700' : 'text-zinc-400 hover:text-cyan-400'
                  }`}
                  title="Acessar LinkedIn de Carlos Bogarin"
                >
                  <span className="truncate">By: Carlos Bogarin</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                </a>
              </div>
            )}
          </div>

          {/* Toggle Button / Close button for Mobile Drawer */}
          {!isCollapsed && (
            <div className="flex items-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCollapsed(true);
                }}
                className={`hidden lg:flex p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors ml-1`}
                title="Recolher barra lateral"
                aria-label="Recolher barra lateral"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className={`lg:hidden p-1.5 rounded-lg transition-colors ml-2 ${
                  isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
                title="Fechar menu lateral"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-2">
          <div className="h-5 flex items-center px-2">
            {!isCollapsed && (
              <span className={`text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-400' : 'text-zinc-500'} truncate`}>
                Módulos da Plataforma
              </span>
            )}
          </div>

          {/* Module 1: Reanálises - ONS */}
          <button
            type="button"
            onClick={() => handleSelect('reanalysis')}
            title="Reanálises - ONS (Conjuntos Eólicos ONS)"
            className={`w-full h-12 flex items-center ${
              isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'
            } rounded-xl text-xs font-semibold transition-all text-left ${
              activeModule === 'reanalysis'
                ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-lg shadow-cyan-600/30'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Compass className="w-6 h-6 shrink-0" />
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="truncate">Reanálises - ONS</span>
                <span className={`text-[10px] font-normal ${activeModule === 'reanalysis' ? 'text-cyan-100' : 'text-zinc-500'} truncate`}>
                  Conjuntos Eólicos ONS
                </span>
              </div>
            )}
          </button>

          {/* Module 2: Reanálises - Manual */}
          <button
            type="button"
            onClick={() => handleSelect('reanalysis_manual')}
            title="Reanálises - Manual (Coordenadas & Mapa)"
            className={`w-full h-12 flex items-center ${
              isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'
            } rounded-xl text-xs font-semibold transition-all text-left ${
              activeModule === 'reanalysis_manual'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-600/30'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <MapPin className="w-6 h-6 shrink-0" />
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="truncate">Reanálises - Manual</span>
                <span className={`text-[10px] font-normal ${activeModule === 'reanalysis_manual' ? 'text-emerald-100' : 'text-zinc-500'} truncate`}>
                  Coordenadas & Mapa
                </span>
              </div>
            )}
          </button>

          {/* Module 3: Torres Anemométricas & LiDAR */}
          <button
            type="button"
            onClick={() => handleSelect('met_mast')}
            title="Torres Anemométricas & LiDAR (QC, Shear, IEC TI & WAsP)"
            className={`w-full h-12 flex items-center ${
              isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'
            } rounded-xl text-xs font-semibold transition-all text-left ${
              activeModule === 'met_mast'
                ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-600/30'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Radio className="w-6 h-6 shrink-0" />
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="truncate">Torres Anemométricas</span>
                <span className={`text-[10px] font-normal ${activeModule === 'met_mast' ? 'text-sky-100' : 'text-zinc-500'} truncate`}>
                  Dados Medidos, QC & WAsP
                </span>
              </div>
            )}
          </button>

          {/* Module 4: Metodologia */}
          <button
            type="button"
            onClick={() => handleSelect('methodology')}
            title="Metodologia (Fórmulas, IDW, MCP, QC & IEC)"
            className={`w-full h-12 flex items-center ${
              isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'
            } rounded-xl text-xs font-semibold transition-all text-left ${
              activeModule === 'methodology'
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg shadow-amber-600/30'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <BookOpen className="w-6 h-6 shrink-0" />
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="truncate">Metodologia</span>
                <span className={`text-[10px] font-normal ${activeModule === 'methodology' ? 'text-amber-100' : 'text-zinc-500'} truncate`}>
                  Fórmulas, MCP, QC & IEC
                </span>
              </div>
            )}
          </button>
        </nav>
      </div>

      {/* Bottom Summary Badge - Exibido apenas no módulo 'Reanálises - ONS' */}
      {activeModule === 'reanalysis' && (
        <div className={`mt-6 pt-4 border-t ${isLight ? 'border-slate-200' : 'border-zinc-800/80'} space-y-2`}>
          {isCollapsed ? (
            <div
              className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100' : 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
              }`}
              title={`Bases Carregadas: ${totalEnsembles || 155} conjuntos, ${totalCompanies || 31} empresas`}
            >
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 mb-1 animate-pulse"></span>
              <span className="text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-400">
                {totalEnsembles || 155}
              </span>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}
    </aside>
  );
};