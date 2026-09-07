import React, { useState, useMemo } from 'react';
import { Database, Search, Zap, MapPin, ExternalLink, ArrowRight } from 'lucide-react';
import { Ensemble } from '../types';

interface CatalogViewProps {
  ensembles: Ensemble[];
  onSelectEnsemble: (idOns: string) => void;
  theme?: 'light' | 'dark';
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  ensembles,
  onSelectEnsemble,
  theme = 'dark',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUf, setSelectedUf] = useState<string>('TODOS');

  const ufs = useMemo(() => {
    const list = Array.from(new Set(ensembles.map((e) => e.state))).sort();
    return ['TODOS', ...list];
  }, [ensembles]);

  const filtered = useMemo(() => {
    return ensembles.filter((e) => {
      const matchUf = selectedUf === 'TODOS' || e.state === selectedUf;
      const matchText =
        !searchTerm ||
        e.ensemble_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.id_ons.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.connection_point.toLowerCase().includes(searchTerm.toLowerCase());
      return matchUf && matchText;
    });
  }, [ensembles, selectedUf, searchTerm]);

  const isLight = theme === 'light';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className={`text-lg font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Database className="w-5 h-5 text-emerald-500" />
            <span>Catálogo Completo de Parques Eólicos ONS</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Base indexada do ONS com coordenadas das Subestações Coletoras e capacidade outorgada
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            {filtered.length} de {ensembles.length} conjuntos
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-zinc-900/80 border-zinc-800'} flex flex-col sm:flex-row items-center gap-3`}>
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por nome do parque, código ONS (ex: CJU_BATUC) ou ponto de conexão..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                : 'bg-zinc-950 border-zinc-800 text-white placeholder-zinc-500'
            }`}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 dark:text-zinc-400 whitespace-nowrap">Filtrar UF:</span>
          <select
            value={selectedUf}
            onChange={(e) => setSelectedUf(e.target.value)}
            className={`border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-900'
                : 'bg-zinc-950 border-zinc-800 text-white'
            }`}
          >
            {ufs.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className={`border rounded-2xl overflow-hidden shadow-xl ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900/90 border-zinc-800'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b ${isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-zinc-950/80 border-zinc-800 text-zinc-400'} uppercase font-semibold text-[11px]`}>
              <tr>
                <th className="px-4 py-3">Conjunto Eólico</th>
                <th className="px-4 py-3">Código ONS</th>
                <th className="px-4 py-3">UF / Subsistema</th>
                <th className="px-4 py-3">Potência (MW)</th>
                <th className="px-4 py-3">SE Coletora (Lat, Lon)</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-100 text-slate-700' : 'divide-zinc-800/60 text-zinc-300'}`}>
              {filtered.map((item) => (
                <tr
                  key={item.id_ons}
                  className={`hover:bg-cyan-50/40 dark:hover:bg-zinc-800/40 transition-colors`}
                >
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                    {item.ensemble_name}
                  </td>
                  <td className="px-4 py-3 font-mono text-zinc-500 dark:text-zinc-400">
                    {item.id_ons}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-[11px] font-medium text-slate-700 dark:text-zinc-300">
                      {item.state} ({item.subsystem})
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                    {item.capacity_mw.toLocaleString('pt-BR')} MW
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-500 dark:text-zinc-400">
                    {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onSelectEnsemble(item.id_ons)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow transition-all"
                    >
                      <span>Analisar Reanálise</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};