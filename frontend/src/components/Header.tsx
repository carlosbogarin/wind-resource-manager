import React from 'react';
import { Wind, Activity, Globe, Database, Cpu, Cloud, Layers } from 'lucide-react';

interface HeaderProps {
  totalCompanies?: number;
  totalEnsembles?: number;
  activeEnsembleName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  totalCompanies,
  totalEnsembles,
  activeEnsembleName,
}) => {
  return (
    <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3.5 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Title */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-bold text-xl">
            <Wind className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Wind Resource Manager
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  v1.0
                </span>
              </h1>
            </div>
            <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
              <span>Séries Históricas de 30 Anos</span>
              <span className="text-zinc-600">•</span>
              <span className="text-cyan-400 font-medium">ERA5 (0.25°)</span>
              <span className="text-zinc-600">&</span>
              <span className="text-amber-400 font-medium">MERRA-2 (0.5°x0.625°)</span>
              <span className="text-zinc-600">•</span>
              <span>ONS ANEEL</span>
            </p>
          </div>
        </div>

        {/* Status Indicators & Active Complex */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {activeEnsembleName && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-medium">
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Conjunto: <strong>{activeEnsembleName}</strong></span>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-zinc-300">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>Catálogo ONS: {totalEnsembles ? `${totalEnsembles} Parques` : 'Ativo'}</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-zinc-300">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cloud Run & Vercel Ready</span>
          </div>
        </div>
      </div>
    </header>
  );
};