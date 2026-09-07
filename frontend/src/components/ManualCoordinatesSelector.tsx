import React, { useState } from 'react';
import { MapPin, Search, Calendar, RefreshCw, Navigation } from 'lucide-react';
import { DateRangeInfo } from '../types';

interface ManualCoordinatesSelectorProps {
  latitude: number;
  longitude: number;
  siteName: string;
  onChangeCoordinates: (lat: number, lon: number, name: string) => void;
  onSearchNodes: () => void;
  isLoading: boolean;
  dateRange: DateRangeInfo | null;
  startMonth?: string;
  endMonth?: string;
  onChangeStartMonth?: (val: string) => void;
  onChangeEndMonth?: (val: string) => void;
  onResetPeriod?: () => void;
  theme?: 'light' | 'dark';
}

export const ManualCoordinatesSelector: React.FC<ManualCoordinatesSelectorProps> = ({
  latitude,
  longitude,
  siteName,
  onChangeCoordinates,
  onSearchNodes,
  isLoading,
  dateRange,
  startMonth,
  endMonth,
  onChangeStartMonth,
  onChangeEndMonth,
  onResetPeriod,
  theme = 'dark',
}) => {
  const [inputLat, setInputLat] = useState(latitude.toString());
  const [inputLon, setInputLon] = useState(longitude.toString());
  const [inputName, setInputName] = useState(siteName);

  // Sync internal inputs when props change (e.g. from map click)
  React.useEffect(() => {
    setInputLat(latitude.toString());
    setInputLon(longitude.toString());
    setInputName(siteName);
  }, [latitude, longitude, siteName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(inputLat);
    const lon = parseFloat(inputLon);
    if (!isNaN(lat) && !isNaN(lon)) {
      onChangeCoordinates(lat, lon, inputName.trim() || 'Ponto Personalizado');
      onSearchNodes();
    }
  };

  const isLight = theme === 'light';

  return (
    <div
      className={`p-4 rounded-2xl border ${
        isLight
          ? 'bg-white border-slate-200 shadow-sm'
          : 'bg-zinc-900/90 border-zinc-800 shadow-xl'
      } space-y-4`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-600/20">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Reanálises - Coordenadas Manuais
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Ponto Avulso
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Insira latitude e longitude ou clique diretamente em qualquer lugar do mapa
            </p>
          </div>
        </div>
      </div>

      {/* Form Inputs */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Site Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
              Nome do Ponto / Mastro
            </label>
            <input
              type="text"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              placeholder="Ex: Mastro 01 / Fazenda Sol"
              className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                  : 'bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500'
              }`}
            />
          </div>

          {/* Latitude */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
              Latitude (-90 a +90)
            </label>
            <input
              type="number"
              step="any"
              value={inputLat}
              onChange={(e) => setInputLat(e.target.value)}
              placeholder="-14.1028"
              required
              className={`w-full px-3 py-2 text-xs font-mono rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900'
                  : 'bg-zinc-800 border-zinc-700 text-white'
              }`}
            />
          </div>

          {/* Longitude */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
              Longitude (-180 a +180)
            </label>
            <input
              type="number"
              step="any"
              value={inputLon}
              onChange={(e) => setInputLon(e.target.value)}
              placeholder="-42.6094"
              required
              className={`w-full px-3 py-2 text-xs font-mono rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900'
                  : 'bg-zinc-800 border-zinc-700 text-white'
              }`}
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span>Buscar Nós da Grade</span>
          </button>
        </div>
      </form>

      {/* Date Range Period Selector */}
      {dateRange && onChangeStartMonth && onChangeEndMonth && (
        <div className={`p-3 rounded-xl border ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950/60 border-zinc-800/80'
        } space-y-2 text-xs`}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-semibold text-slate-700 dark:text-zinc-300">
                Janela Temporal de Análise
              </span>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                (Disponível: {dateRange.start_year_month} até {dateRange.end_year_month})
              </span>
            </div>
            {onResetPeriod && (
              <button
                type="button"
                onClick={onResetPeriod}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
              >
                Restaurar 30 Anos ({dateRange.total_years} anos)
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-zinc-400 font-medium">De:</span>
              <input
                type="month"
                min={dateRange.start_year_month}
                max={endMonth || dateRange.end_year_month}
                value={startMonth || dateRange.start_year_month}
                onChange={(e) => onChangeStartMonth(e.target.value)}
                className={`px-2 py-1 rounded-lg border text-xs ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-800'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-200'
                }`}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-zinc-400 font-medium">Até:</span>
              <input
                type="month"
                min={startMonth || dateRange.start_year_month}
                max={dateRange.end_year_month}
                value={endMonth || dateRange.end_year_month}
                onChange={(e) => onChangeEndMonth(e.target.value)}
                className={`px-2 py-1 rounded-lg border text-xs ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-800'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-200'
                }`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Map Hint */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 pt-1">
        <Navigation className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        <span>
          <strong>Dica Interativa:</strong> Clique diretamente sobre o mapa ao lado para posicionar o ponto em qualquer região eólica do Brasil.
        </span>
      </div>
    </div>
  );
};
