import React, { useState, useEffect } from 'react';
import {
  Database,
  ShieldCheck,
  Compass,
  Download,
  FolderOpen,
  Loader2,
  AlertCircle,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import type { MetMastDatasetItem, MetMastLoadedDataset, MetMastQCResult } from '../../types';
import { fetchMetMastDatasets, loadMetMastDataset } from '../../services/api';
import { MetMastDatasetModal } from './MetMastDatasetModal';
import { MetMastDataTab } from './MetMastDataTab';
import { MetMastQCTab } from './MetMastQCTab';
import { MetMastAnalysisTab } from './MetMastAnalysisTab';
import { MetMastExportTab } from './MetMastExportTab';

interface MetMastStudioProps {
  onOpenCoordsInReanalysis?: (lat: number, lon: number, siteName: string) => void;
  theme?: 'light' | 'dark';
}

export const MetMastStudio: React.FC<MetMastStudioProps> = ({
  onOpenCoordsInReanalysis,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [currentTab, setCurrentTab] = useState<'data' | 'qc' | 'analysis' | 'export'>('data');
  const [datasets, setDatasets] = useState<MetMastDatasetItem[]>([]);
  const [dataset, setDataset] = useState<MetMastLoadedDataset | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [qcVersion, setQcVersion] = useState<number>(0);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const available = await fetchMetMastDatasets();
      setDatasets(available);
      const defaultId = available[0]?.id || 'demo_data';
      const loaded = await loadMetMastDataset(defaultId);
      setDataset(loaded);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Erro ao carregar módulo de Torres Anemométricas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleSelectDataset = async (datasetId: string) => {
    setLoading(true);
    setError(null);
    try {
      const loaded = await loadMetMastDataset(datasetId);
      setDataset(loaded);
      setQcVersion((v) => v + 1);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Erro ao carregar campanha selecionada.');
    } finally {
      setLoading(false);
    }
  };

  const handleDatasetUploaded = async () => {
    try {
      const available = await fetchMetMastDatasets();
      setDatasets(available);
    } catch {
      // Ignora erro não crítico na atualização da listagem
    }
  };

  const handleQcStatusChanged = (res: MetMastQCResult | null) => {
    setQcVersion((v) => v + 1);
    setDataset((prev) =>
      prev
        ? {
            ...prev,
            qc_applied: res !== null,
            qc_summary: res,
          }
        : null
    );
  };

  const cardClass = isLight
    ? 'bg-white border-slate-200 shadow-sm'
    : 'bg-zinc-900/90 border-zinc-800 shadow-sm';

  return (
    <div className="space-y-6">
      {/* Cabeçalho Operacional da Torre & Sub-navegação */}
      <div className={`border rounded-2xl p-4 space-y-4 ${cardClass}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-500 text-white shadow-md shadow-cyan-500/20 shrink-0">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Campanha Anemométrica & LiDAR
                </h2>
                {dataset && (
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/25">
                    {dataset.dataset_id}
                  </span>
                )}
                {dataset?.qc_applied && dataset.qc_summary && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>QC Ativo ({dataset.qc_summary.valid_pct}% válidos)</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Ingestão de dados medidos em campo, controle de qualidade físico, cisalhamento vertical, turbulência IEC 61400-1 e geração de tabelas WAsP (.tab)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer shrink-0 self-start md:self-auto"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Carregar / Enviar Torre</span>
          </button>
        </div>

        {/* Barra de Sub-abas */}
        <div
          className={`flex items-center gap-1.5 border-t pt-3 overflow-x-auto ${
            isLight ? 'border-slate-100' : 'border-zinc-800/80'
          }`}
        >
          {(
            [
              { id: 'data', label: 'Dados & Sensores', Icon: Database },
              { id: 'qc', label: 'Controle de Qualidade (QC)', Icon: ShieldCheck },
              { id: 'analysis', label: 'Análises Eólicas (Shear & IEC)', Icon: Compass },
              { id: 'export', label: 'Exportar (WAsP .tab & CSV)', Icon: Download },
            ] as const
          ).map(({ id, label, Icon }) => {
            const active = currentTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setCurrentTab(id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/70'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Erro Global */}
      {error && (
        <div className="flex items-center justify-between gap-3 text-rose-500 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadInitialData}
            className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 font-semibold transition-colors cursor-pointer shrink-0"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Conteúdo */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-80 space-y-3 text-slate-500 dark:text-zinc-400">
          <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
          <span className="text-xs font-medium">
            Carregando campanha anemométrica e inicializando motor BrightWind...
          </span>
        </div>
      ) : (
        <>
          {currentTab === 'data' && (
            <MetMastDataTab
              dataset={dataset}
              onNavigateToQC={() => setCurrentTab('qc')}
              onNavigateToAnalysis={() => setCurrentTab('analysis')}
              theme={theme}
            />
          )}

          {currentTab === 'qc' && (
            <MetMastQCTab
              dataset={dataset}
              onQcStatusChanged={handleQcStatusChanged}
              theme={theme}
            />
          )}

          {currentTab === 'analysis' && (
            <MetMastAnalysisTab
              dataset={dataset}
              qcVersion={qcVersion}
              theme={theme}
            />
          )}

          {currentTab === 'export' && (
            <MetMastExportTab
              dataset={dataset}
              onOpenCoordsInReanalysis={onOpenCoordsInReanalysis}
              theme={theme}
            />
          )}
        </>
      )}

      {/* Modal de Seleção & Upload */}
      <MetMastDatasetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        datasets={datasets}
        currentDatasetId={dataset?.dataset_id}
        onSelectDataset={handleSelectDataset}
        onDatasetUploaded={handleDatasetUploaded}
        theme={theme}
      />
    </div>
  );
};
