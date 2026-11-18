import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { MetMastDatasetItem } from '../../types';
import { uploadMetMastDataset } from '../../services/api';

interface MetMastDatasetModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasets: MetMastDatasetItem[];
  currentDatasetId?: string;
  onSelectDataset: (id: string) => void;
  onDatasetUploaded: () => void;
  theme?: 'light' | 'dark';
}

export const MetMastDatasetModal: React.FC<MetMastDatasetModalProps> = ({
  isOpen,
  onClose,
  datasets,
  currentDatasetId,
  onSelectDataset,
  onDatasetUploaded,
  theme = 'dark',
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLight = theme === 'light';

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const res = await uploadMetMastDataset(file);
      onDatasetUploaded();
      onSelectDataset(res.dataset_id);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Erro ao carregar arquivo.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className={`rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-900 border-zinc-800 text-zinc-100'
        }`}
      >
        {/* Cabeçalho */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isLight ? 'border-slate-200' : 'border-zinc-800'
          }`}
        >
          <div>
            <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Carregar Campanha Anemométrica
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Selecione uma torre padrão de referência ou envie seu arquivo de medição (.csv, .txt, .dat, .tim)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="flex items-center space-x-2 text-rose-500 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Upload */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-2 block">
              Enviar Arquivo de Torre Anemométrica / LiDAR
            </label>
            <label
              className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors group ${
                isLight
                  ? 'border-slate-300 hover:border-cyan-500 bg-slate-50'
                  : 'border-zinc-700 hover:border-cyan-500/60 bg-zinc-950/60'
              }`}
            >
              <input
                type="file"
                accept=".csv,.txt,.dat,.tim"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              {uploading ? (
                <div className="flex flex-col items-center space-y-2 text-cyan-500">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-xs font-medium">Processando e indexando arquivo...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-1.5 text-slate-500 dark:text-zinc-400 group-hover:text-cyan-500 transition-colors text-center">
                  <Upload className="w-7 h-7" />
                  <span className="text-xs font-semibold">Clique para selecionar um arquivo local</span>
                  <span className="text-[11px] opacity-80">
                    Compatível com CSV, Campbell Scientific (.dat/.csv) e arquivos tabulares (.txt/.tim)
                  </span>
                </div>
              )}
            </label>
          </div>

          {/* Lista de Datasets */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-2 block">
              Datasets Disponíveis
            </label>
            <div className="space-y-2">
              {datasets.map((item) => {
                const isSelected = item.id === currentDatasetId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectDataset(item.id);
                      onClose();
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? isLight
                          ? 'bg-cyan-50 border-cyan-400 ring-1 ring-cyan-500/30'
                          : 'bg-cyan-950/30 border-cyan-500/60 ring-1 ring-cyan-500/30'
                        : isLight
                        ? 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                        : 'bg-zinc-950/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0 pr-3">
                      <div
                        className={`p-2 rounded-lg shrink-0 ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-500'
                            : isLight
                            ? 'bg-slate-200 text-slate-600'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold flex items-center space-x-2">
                          <span className="truncate">{item.name}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${
                              isLight
                                ? 'bg-white text-slate-600 border-slate-200'
                                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                            }`}
                          >
                            {item.type === 'uploaded' ? 'enviado' : 'padrão'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-cyan-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div
          className={`px-6 py-3 border-t flex justify-end ${
            isLight ? 'border-slate-200 bg-slate-50' : 'border-zinc-800 bg-zinc-950/60'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              isLight
                ? 'text-slate-700 bg-slate-200 hover:bg-slate-300'
                : 'text-zinc-300 bg-zinc-800 hover:bg-zinc-700'
            }`}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
