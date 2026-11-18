import React, { useState, useEffect } from 'react';
import {
  Download,
  FileCode,
  FileSpreadsheet,
  CheckCircle,
  Wind,
  MapPin,
  AlertCircle,
} from 'lucide-react';
import type { MetMastLoadedDataset } from '../../types';
import { downloadMetMastWaspTab, downloadMetMastCleanCsv } from '../../services/api';

interface MetMastExportTabProps {
  dataset: MetMastLoadedDataset | null;
  onOpenCoordsInReanalysis?: (lat: number, lon: number, siteName: string) => void;
  theme?: 'light' | 'dark';
}

export const MetMastExportTab: React.FC<MetMastExportTabProps> = ({
  dataset,
  onOpenCoordsInReanalysis,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const speedCols = dataset?.columns.filter((c) => c.role === 'speed') || [];
  const dirCols = dataset?.columns.filter((c) => c.role === 'direction') || [];

  const [mastName, setMastName] = useState<string>('Torre_Eolica_01');
  const [selectedSpeedCol, setSelectedSpeedCol] = useState<string>(speedCols[0]?.name || '');
  const [selectedDirCol, setSelectedDirCol] = useState<string>(dirCols[0]?.name || '');
  const [height, setHeight] = useState<number>(speedCols[0]?.height || 80);
  const [lat, setLat] = useState<number>(-5.1234);
  const [lon, setLon] = useState<number>(-37.5678);
  const [applyQC, setApplyQC] = useState<boolean>(true);
  const [downloadingTab, setDownloadingTab] = useState<boolean>(false);
  const [downloadingCsv, setDownloadingCsv] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!speedCols.some((c) => c.name === selectedSpeedCol)) {
      const first = speedCols[0];
      setSelectedSpeedCol(first?.name || '');
      if (first?.height) setHeight(first.height);
    }
    if (!dirCols.some((c) => c.name === selectedDirCol)) {
      setSelectedDirCol(dirCols[0]?.name || '');
    }
  }, [dataset?.dataset_id]);

  const handleExportWasp = async () => {
    if (!selectedSpeedCol || !selectedDirCol || !dataset) return;
    setDownloadingTab(true);
    setError(null);
    try {
      await downloadMetMastWaspTab(
        selectedSpeedCol,
        selectedDirCol,
        height,
        mastName,
        lat,
        lon,
        applyQC,
        dataset.dataset_id
      );
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Falha ao gerar arquivo .tab WAsP.');
    } finally {
      setDownloadingTab(false);
    }
  };

  const handleDownloadCsv = async () => {
    if (!dataset) return;
    setDownloadingCsv(true);
    setError(null);
    try {
      await downloadMetMastCleanCsv(applyQC, dataset.dataset_id);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Falha ao exportar série CSV.');
    } finally {
      setDownloadingCsv(false);
    }
  };

  const cardClass = isLight
    ? 'bg-white border-slate-200 shadow-sm'
    : 'bg-zinc-900 border-zinc-800 shadow-sm';
  const inputClass = isLight
    ? 'w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-2 font-mono text-xs focus:outline-none focus:border-cyan-500'
    : 'w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-lg p-2 font-mono text-xs focus:outline-none focus:border-cyan-500';

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center space-x-2 text-rose-500 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Exportar WAsP .tab */}
        <div className={`border rounded-2xl p-6 space-y-5 ${cardClass}`}>
          <div
            className={`flex items-center space-x-3 border-b pb-4 ${
              isLight ? 'border-slate-200' : 'border-zinc-800'
            }`}
          >
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-500">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Exportar Arquivo .tab (WAsP)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Tabela bidimensional para WAsP, Openwind e WindPRO
              </p>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="text-slate-500 dark:text-zinc-400 font-semibold block mb-1">
                Identificador da Torre
              </label>
              <input
                type="text"
                value={mastName}
                onChange={(e) => setMastName(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-500 dark:text-zinc-400 font-semibold block mb-1">
                  Canal de Velocidade
                </label>
                <select
                  value={selectedSpeedCol}
                  onChange={(e) => {
                    setSelectedSpeedCol(e.target.value);
                    const matched = speedCols.find((c) => c.name === e.target.value);
                    if (matched && matched.height) setHeight(matched.height);
                  }}
                  className={inputClass}
                >
                  {speedCols.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-500 dark:text-zinc-400 font-semibold block mb-1">
                  Canal de Direção
                </label>
                <select
                  value={selectedDirCol}
                  onChange={(e) => setSelectedDirCol(e.target.value)}
                  className={inputClass}
                >
                  {dirCols.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-500 dark:text-zinc-400 font-semibold block mb-1">
                Cota do Anemômetro (m)
              </label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-500 dark:text-zinc-400 font-semibold block mb-1">
                  Latitude (°)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-slate-500 dark:text-zinc-400 font-semibold block mb-1">
                  Longitude (°)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={lon}
                  onChange={(e) => setLon(parseFloat(e.target.value) || 0)}
                  className={inputClass}
                />
              </div>
            </div>

            <label className="flex items-center space-x-2 text-xs text-slate-600 dark:text-zinc-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={applyQC}
                onChange={(e) => setApplyQC(e.target.checked)}
                className="accent-cyan-500"
              />
              <span>Exportar considerando filtros de QC aplicados</span>
            </label>

            <button
              type="button"
              onClick={handleExportWasp}
              disabled={downloadingTab || !selectedSpeedCol || !selectedDirCol}
              className="w-full mt-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md shadow-cyan-600/20 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{downloadingTab ? 'Gerando arquivo .tab...' : 'Baixar Tabela WAsP (.tab)'}</span>
            </button>
          </div>
        </div>

        {/* Card 2: CSV Limpo */}
        <div className={`border rounded-2xl p-6 space-y-5 flex flex-col justify-between ${cardClass}`}>
          <div>
            <div
              className={`flex items-center space-x-3 border-b pb-4 mb-4 ${
                isLight ? 'border-slate-200' : 'border-zinc-800'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Exportar Série Tratada (.csv)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Série temporal pós-tratamento de QC
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed mb-4">
              Exporte o arquivo completo com registros válidos em conformidade com as regras de limites físicos, sombra de torre e congelamento aplicadas nesta sessão.
            </p>

            <div
              className={`border rounded-xl p-3 space-y-1.5 text-xs ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-zinc-950 border-zinc-800 text-zinc-400'
              }`}
            >
              <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Compatível com Excel, Polars, Pandas e R</span>
              </div>
              <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Carimbo temporal ISO 8601 preservado</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={downloadingCsv || !dataset}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{downloadingCsv ? 'Exportando CSV...' : 'Baixar Dados Tratados (CSV)'}</span>
          </button>
        </div>

        {/* Card 3: Ficha Técnica + Integração com Reanálises */}
        <div className={`border rounded-2xl p-6 space-y-4 flex flex-col justify-between ${cardClass}`}>
          <div className="space-y-4">
            <h3
              className={`font-bold text-sm border-b pb-3 flex items-center space-x-2 ${
                isLight ? 'border-slate-200 text-slate-900' : 'border-zinc-800 text-white'
              }`}
            >
              <Wind className="w-4 h-4 text-cyan-500" />
              <span>Ficha Técnica da Campanha</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <div
                className={`p-2.5 rounded-xl border flex justify-between items-center ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-800'
                }`}
              >
                <span className="text-slate-500 dark:text-zinc-400">Dataset Ativo</span>
                <span className="font-mono font-semibold truncate max-w-[160px]" title={dataset?.dataset_id}>
                  {dataset?.dataset_id}
                </span>
              </div>

              <div
                className={`p-2.5 rounded-xl border flex justify-between items-center ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-800'
                }`}
              >
                <span className="text-slate-500 dark:text-zinc-400">Período</span>
                <span className="font-mono">
                  {dataset?.start_time.split(' ')[0]} até {dataset?.end_time.split(' ')[0]}
                </span>
              </div>

              <div
                className={`p-2.5 rounded-xl border flex justify-between items-center ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-800'
                }`}
              >
                <span className="text-slate-500 dark:text-zinc-400">Total de Registros</span>
                <span className="font-mono">{dataset?.total_rows.toLocaleString('pt-BR')}</span>
              </div>

              <div
                className={`p-2.5 rounded-xl border flex justify-between items-center ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-800'
                }`}
              >
                <span className="text-slate-500 dark:text-zinc-400">Resolução Temporal</span>
                <span className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold">
                  {dataset?.sampling_interval_min} min
                </span>
              </div>

              <div
                className={`p-2.5 rounded-xl border flex justify-between items-center ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-800'
                }`}
              >
                <span className="text-slate-500 dark:text-zinc-400">Motor Anemométrico</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  BrightWind Engine
                </span>
              </div>
            </div>
          </div>

          {onOpenCoordsInReanalysis && (
            <button
              type="button"
              onClick={() => onOpenCoordsInReanalysis(lat, lon, mastName)}
              className={`w-full py-2.5 px-4 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer ${
                isLight
                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                  : 'bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-300 border-emerald-700/40'
              }`}
              title="Abrir estas coordenadas diretamente no módulo Reanálises - Manual para obter 30 anos de ERA5 e MERRA-2"
            >
              <MapPin className="w-4 h-4" />
              <span>Consultar Reanálises (ERA5/MERRA-2) neste Sítio</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
