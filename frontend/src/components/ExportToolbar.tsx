import React from 'react';
import { FileSpreadsheet, FileDown, Calendar } from 'lucide-react';
import { getExportCsvUrl, getExportParquetUrl } from '../services/api';

interface ExportToolbarProps {
  selectedNodeId: string;
  model: string;
  latitude: number;
  longitude: number;
  startYear: number;
  endYear: number;
  startPeriod?: string;
  endPeriod?: string;
  isCached: boolean;
}

export const ExportToolbar: React.FC<ExportToolbarProps> = ({
  selectedNodeId,
  model,
  latitude,
  longitude,
  startYear,
  endYear,
  startPeriod,
  endPeriod,
  isCached,
}) => {
  const params = {
    node_id: selectedNodeId,
    model,
    latitude,
    longitude,
    start_year: startYear,
    end_year: endYear,
    start_month: startPeriod,
    end_month: endPeriod,
  };

  const csvUrl = getExportCsvUrl(params);
  const parquetUrl = getExportParquetUrl(params);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 text-xs">
      <div className="flex items-center gap-2 text-zinc-400">
        <Calendar className="w-4 h-4 text-cyan-400" />
        <span>Período Histórico: <strong className="text-zinc-200">{startPeriod || startYear} até {endPeriod || endYear}</strong></span>
        <span className="text-zinc-600">•</span>
        <span>Nó: <strong className="text-white">{selectedNodeId}</strong> ({model})</span>
      </div>

      <div className="flex items-center gap-2">
        <a
          href={csvUrl}
          download
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            isCached
              ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
              : 'opacity-50 pointer-events-none bg-zinc-900 text-zinc-500 border-zinc-800'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          <span>Exportar CSV</span>
        </a>

        <a
          href={parquetUrl}
          download
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            isCached
              ? 'bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border-cyan-700/50'
              : 'opacity-50 pointer-events-none bg-zinc-900 text-zinc-500 border-zinc-800'
          }`}
        >
          <FileDown className="w-3.5 h-3.5 text-cyan-400" />
          <span>Exportar Parquet</span>
        </a>
      </div>
    </div>
  );
};