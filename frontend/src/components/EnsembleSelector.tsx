import React, { useState, useMemo } from 'react';
import { Wind, Search, MapPin, Zap, Check, ChevronDown } from 'lucide-react';
import { Ensemble } from '../types';

interface EnsembleSelectorProps {
  ensembles: Ensemble[];
  selectedIdOns: string | null;
  onSelectEnsemble: (idOns: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export const EnsembleSelector: React.FC<EnsembleSelectorProps> = ({
  ensembles,
  selectedIdOns,
  onSelectEnsemble,
  isLoading,
  disabled,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredEnsembles = useMemo(() => {
    if (!searchTerm) return ensembles;
    const term = searchTerm.toLowerCase();
    return ensembles.filter(
      (e) =>
        e.ensemble_name.toLowerCase().includes(term) ||
        e.id_ons.toLowerCase().includes(term) ||
        e.state.toLowerCase().includes(term)
    );
  }, [ensembles, searchTerm]);

  const active = ensembles.find((e) => e.id_ons === selectedIdOns);

  return (
    <div className="relative">
      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">2</span>
        <span>Conjunto Eólico (nom_usina_conjunto)</span>
      </label>

      {/* Button trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        className={`w-full text-left bg-zinc-900 border rounded-xl px-4 py-3 flex items-center justify-between transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
          disabled
            ? 'border-zinc-800/60 opacity-50 cursor-not-allowed'
            : 'border-zinc-800 hover:border-zinc-700 cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-3 truncate">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <Wind className="w-4 h-4" />
          </div>
          <div className="truncate">
            {active ? (
              <>
                <p className="text-sm font-semibold text-white truncate flex items-center gap-2">
                  {active.ensemble_name}
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    {active.id_ons}
                  </span>
                </p>
                <p className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                  <span className="text-emerald-400 font-medium">{active.capacity_mw} MW</span>
                  <span>•</span>
                  <span>UF: {active.state}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-zinc-500 truncate">
                    <MapPin className="w-3 h-3 text-red-400 flex-shrink-0" />
                    SE: {active.latitude.toFixed(4)}, {active.longitude.toFixed(4)}
                  </span>
                </p>
              </>
            ) : (
              <p className="text-sm text-zinc-400">
                {disabled
                  ? 'Selecione primeiro uma empresa acima...'
                  : isLoading
                  ? 'Carregando conjuntos eólicos...'
                  : 'Escolha o parque/conjunto eólico...'}
              </p>
            )}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-40 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-3 border-b border-zinc-800">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar parque por nome, código ONS ou UF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-zinc-800/50">
            {filteredEnsembles.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-500">Nenhum conjunto encontrado</div>
            ) : (
              filteredEnsembles.map((ens) => {
                const isSelected = ens.id_ons === selectedIdOns;
                return (
                  <button
                    key={ens.id_ons}
                    type="button"
                    onClick={() => {
                      onSelectEnsemble(ens.id_ons);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-zinc-800/60 transition-colors ${
                      isSelected ? 'bg-emerald-950/20 text-emerald-300' : 'text-zinc-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{ens.ensemble_name}</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                          {ens.id_ons}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                        <span className="flex items-center gap-1 font-medium text-emerald-400">
                          <Zap className="w-3 h-3 text-amber-400" />
                          {ens.capacity_mw} MW
                        </span>
                        <span>•</span>
                        <span>UF: {ens.state} ({ens.subsystem})</span>
                        <span>•</span>
                        <span className="text-zinc-500">
                          SE Coletora: {ens.latitude.toFixed(4)}, {ens.longitude.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};