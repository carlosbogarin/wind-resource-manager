import React, { useState, useMemo } from 'react';
import { Building2, Search, Zap, Check, ChevronDown } from 'lucide-react';
import { CompanySummary } from '../types';

interface CompanySelectorProps {
  companies: CompanySummary[];
  selectedCompany: string | null;
  onSelectCompany: (company: string) => void;
  isLoading?: boolean;
}

export const CompanySelector: React.FC<CompanySelectorProps> = ({
  companies,
  selectedCompany,
  onSelectCompany,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredCompanies = useMemo(() => {
    if (!searchTerm) return companies;
    const term = searchTerm.toLowerCase();
    return companies.filter(
      (c) =>
        c.company_name.toLowerCase().includes(term) ||
        c.states.some((s) => s.toLowerCase().includes(term))
    );
  }, [companies, searchTerm]);

  const active = companies.find((c) => c.company_name === selectedCompany);

  return (
    <div className="relative">
      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold">1</span>
        <span>Empresa Operadora (nom_agenteoperador)</span>
      </label>

      {/* Button trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="w-full text-left bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl px-4 py-3 flex items-center justify-between transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
      >
        <div className="flex items-center gap-3 truncate">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-cyan-400 flex-shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="truncate">
            {active ? (
              <>
                <p className="text-sm font-semibold text-white truncate">{active.company_name}</p>
                <p className="text-xs text-zinc-400 flex items-center gap-2">
                  <span>{active.total_ensembles} conjuntos</span>
                  <span>•</span>
                  <span className="text-cyan-400 font-medium">{active.total_mw.toLocaleString('pt-BR')} MW</span>
                  {active.states.length > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-zinc-500">{active.states.join(', ')}</span>
                    </>
                  )}
                </p>
              </>
            ) : (
              <p className="text-sm text-zinc-400">
                {isLoading ? 'Carregando empresas do ONS...' : 'Selecione uma empresa operadora...'}
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
                placeholder="Buscar empresa ou estado (ex: AUREN, ENEL, BA, RN)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-zinc-800/50">
            {filteredCompanies.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-500">Nenhuma empresa encontrada</div>
            ) : (
              filteredCompanies.map((comp) => {
                const isSelected = comp.company_name === selectedCompany;
                return (
                  <button
                    key={comp.company_name}
                    type="button"
                    onClick={() => {
                      onSelectCompany(comp.company_name);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-zinc-800/60 transition-colors ${
                      isSelected ? 'bg-cyan-950/20 text-cyan-300' : 'text-zinc-200'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-white flex items-center gap-2">
                        {comp.company_name}
                        {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-400" />
                          {comp.total_mw.toLocaleString('pt-BR')} MW
                        </span>
                        <span>•</span>
                        <span>{comp.total_ensembles} conjuntos eólicos</span>
                        {comp.states.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[10px] text-zinc-300">
                              {comp.states.join(', ')}
                            </span>
                          </>
                        )}
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