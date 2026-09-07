import React from 'react';
import { FileSpreadsheet, FileDown, Wind, MapPin, Building2, Zap, CheckCircle2 } from 'lucide-react';
import { Ensemble, ReanalysisNode } from '../types';
import { getExportCsvUrl, getExportParquetUrl } from '../services/api';

interface DossierViewProps {
  ensemble: Ensemble | null;
  companyName: string | null;
  selectedNode: ReanalysisNode | null;
  startYear: number;
  endYear: number;
  theme?: 'light' | 'dark';
}

export const DossierView: React.FC<DossierViewProps> = ({
  ensemble,
  companyName,
  selectedNode,
  startYear,
  endYear,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';

  if (!ensemble) {
    return (
      <div className={`p-12 text-center rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'}`}>
        <Wind className="w-12 h-12 text-zinc-500 mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-700 dark:text-zinc-300">Nenhum conjunto eólico selecionado</p>
        <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Selecione uma empresa e um conjunto no módulo de Reanálises.</p>
      </div>
    );
  }

  const exportParams = selectedNode
    ? {
        node_id: selectedNode.node_id,
        model: selectedNode.model,
        latitude: selectedNode.latitude,
        longitude: selectedNode.longitude,
        start_year: startYear,
        end_year: endYear,
      }
    : null;

  const csvUrl = exportParams ? getExportCsvUrl(exportParams) : '#';
  const parquetUrl = exportParams ? getExportParquetUrl(exportParams) : '#';

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-lg font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
          <FileSpreadsheet className="w-5 h-5 text-purple-500" />
          <span>Dossiê Executivo & Exportação do Recurso Eólico</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400">
          Relatório consolidado com metadados regulatórios ONS e extração dos dados de reanálise de 30 anos
        </p>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-zinc-900/90 border-zinc-800'}`}>
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-zinc-500 mb-1">
            <Building2 className="w-4 h-4 text-cyan-500" />
            <span>Empresa Operadora</span>
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-white truncate">{companyName || 'Independente'}</p>
          <p className="text-[11px] text-zinc-500 mt-1">Agente Operador ONS</p>
        </div>

        <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-zinc-900/90 border-zinc-800'}`}>
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-zinc-500 mb-1">
            <Wind className="w-4 h-4 text-emerald-500" />
            <span>Conjunto Eólico</span>
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-white truncate">{ensemble.ensemble_name}</p>
          <p className="text-[11px] font-mono text-zinc-500 mt-1">Código: {ensemble.id_ons}</p>
        </div>

        <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-zinc-900/90 border-zinc-800'}`}>
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-zinc-500 mb-1">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Potência Instalada</span>
          </div>
          <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{ensemble.capacity_mw.toLocaleString('pt-BR')} MW</p>
          <p className="text-[11px] text-zinc-500 mt-1">UF: {ensemble.state} ({ensemble.subsystem_name})</p>
        </div>

        <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-zinc-900/90 border-zinc-800'}`}>
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-zinc-500 mb-1">
            <MapPin className="w-4 h-4 text-red-500" />
            <span>Subestação Coletora</span>
          </div>
          <p className="text-base font-mono font-bold text-slate-900 dark:text-white">
            {ensemble.latitude.toFixed(4)}, {ensemble.longitude.toFixed(4)}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1 truncate">{ensemble.connection_point}</p>
        </div>
      </div>

      {/* Export Section */}
      <div className={`p-6 rounded-2xl border ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-zinc-900/90 border-zinc-800'} space-y-4`}>
        <div className="border-b border-slate-100 dark:border-zinc-800 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Exportação da Série Histórica (30 Anos)</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Nó ativo: <strong>{selectedNode?.node_id || 'ERA5-NW'}</strong> ({selectedNode?.model || 'ERA5'}) • Período: {startYear} a {endYear}
            </p>
          </div>
          {selectedNode?.is_cached && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Série Carregada em Cache</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className={`p-4 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950/60 border-zinc-800'} space-y-3`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Arquivo CSV Universal</h4>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">Compatível com Excel, PowerBI, Python e R</p>
              </div>
            </div>
            <a
              href={csvUrl}
              download
              className={`w-full py-2 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                selectedNode
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow'
                  : 'opacity-50 pointer-events-none bg-zinc-800 text-zinc-500'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Baixar Arquivo CSV</span>
            </a>
          </div>

          <div className={`p-4 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950/60 border-zinc-800'} space-y-3`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                <FileDown className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Arquivo Parquet Colunar</h4>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">Compactado, alta velocidade para DuckDB e Polars</p>
              </div>
            </div>
            <a
              href={parquetUrl}
              download
              className={`w-full py-2 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                selectedNode
                  ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow'
                  : 'opacity-50 pointer-events-none bg-zinc-800 text-zinc-500'
              }`}
            >
              <FileDown className="w-4 h-4" />
              <span>Baixar Arquivo Parquet</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};