import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react';
import { ReanalysisNode, SubstationGeo } from '../types';

interface VortexExtrapolationCardProps {
  substation: SubstationGeo | null;
  era5Nodes: ReanalysisNode[];
  merra2Nodes: ReanalysisNode[];
  selectedModel: 'ERA5' | 'MERRA-2';
  onRunExtrapolation: (model: 'ERA5' | 'MERRA-2') => Promise<void>;
  isExtrapolating: boolean;
  hasExtrapolatedSeries: boolean;
  isExtrapolatedActive: boolean;
  onToggleExtrapolatedActive: (active: boolean) => void;
  extrapolationDetails?: {
    recordsCount?: number;
    fileSizeMb?: number;
    cached?: boolean;
    weights?: Record<string, number>;
  } | null;
  theme?: 'light' | 'dark';
}

export const VortexExtrapolationCard: React.FC<VortexExtrapolationCardProps> = ({
  substation,
  era5Nodes,
  merra2Nodes,
  selectedModel,
  onRunExtrapolation,
  isExtrapolating,
  hasExtrapolatedSeries,
  isExtrapolatedActive,
  onToggleExtrapolatedActive,
  extrapolationDetails,
  theme = 'dark',
}) => {
  const [modelToExtrapolate, setModelToExtrapolate] = useState<'ERA5' | 'MERRA-2'>(selectedModel);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const isLight = theme === 'light';

  if (!substation) return null;

  // Closest nodes for comparison before choosing
  const closestEra5 = era5Nodes.length > 0
    ? [...era5Nodes].sort((a, b) => a.distance_km - b.distance_km)[0]
    : null;

  const closestMerra2 = merra2Nodes.length > 0
    ? [...merra2Nodes].sort((a, b) => a.distance_km - b.distance_km)[0]
    : null;

  const activeNodes = modelToExtrapolate === 'ERA5' ? era5Nodes : merra2Nodes;

  return (
    <div
      className={`rounded-2xl border transition-all ${
        isLight
          ? 'bg-white border-slate-200 shadow-sm'
          : 'bg-zinc-900/90 border-zinc-800 shadow-xl'
      } overflow-hidden`}
    >
      {/* Header Bar */}
      <div
        className={`p-4 flex items-center justify-between cursor-pointer border-b ${
          isLight ? 'border-slate-100 hover:bg-slate-50' : 'border-zinc-800/80 hover:bg-zinc-800/40'
        } transition-colors`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Extrapolação Horizontal na Coordenada Alvo
              </h3>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">
                IDW Vetorial (u, v)
              </span>
              {hasExtrapolatedSeries && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Sintetizada
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Sintetização horária no ponto exato ponderada pelos 4 nós circundantes (Shepard, 1968)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
            aria-label="Expandir ou recolher painel de extrapolação"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Section 1: Pre-extrapolation Comparison (Closest Nodes) */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              1. Escolha a Fonte de Reanálise para Extrapolação:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* ERA5 Card */}
              <div
                onClick={() => setModelToExtrapolate('ERA5')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  modelToExtrapolate === 'ERA5'
                    ? isLight
                      ? 'border-cyan-500 bg-cyan-50/70 ring-1 ring-cyan-400'
                      : 'border-cyan-500 bg-cyan-950/40 ring-1 ring-cyan-500'
                    : isLight
                    ? 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-500"></div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">ERA5 ECMWF (0.25°)</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">
                    Grade ~28 km
                  </span>
                </div>
                {closestEra5 ? (
                  <div className="text-xs space-y-1 text-slate-600 dark:text-zinc-300">
                    <div className="flex justify-between">
                      <span>Nó mais próximo:</span>
                      <strong className="text-slate-900 dark:text-white font-mono">
                        {closestEra5.position} ({closestEra5.distance_km} km • {closestEra5.cardinal_direction})
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Peso IDW na coordenada:</span>
                      <strong className="text-cyan-600 dark:text-cyan-400 font-mono">
                        {(closestEra5.weight * 100).toFixed(1)}%
                      </strong>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                      <span>Coord do nó:</span>
                      <span className="font-mono">{closestEra5.latitude.toFixed(4)}, {closestEra5.longitude.toFixed(4)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Nenhum nó ERA5 carregado</p>
                )}
              </div>

              {/* MERRA-2 Card */}
              <div
                onClick={() => setModelToExtrapolate('MERRA-2')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  modelToExtrapolate === 'MERRA-2'
                    ? isLight
                      ? 'border-amber-500 bg-amber-50/70 ring-1 ring-amber-400'
                      : 'border-amber-500 bg-amber-950/40 ring-1 ring-amber-500'
                    : isLight
                    ? 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">MERRA-2 NASA (0.5°x0.625°)</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    Grade ~50 km
                  </span>
                </div>
                {closestMerra2 ? (
                  <div className="text-xs space-y-1 text-slate-600 dark:text-zinc-300">
                    <div className="flex justify-between">
                      <span>Nó mais próximo:</span>
                      <strong className="text-slate-900 dark:text-white font-mono">
                        {closestMerra2.position} ({closestMerra2.distance_km} km • {closestMerra2.cardinal_direction})
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Peso IDW na coordenada:</span>
                      <strong className="text-amber-600 dark:text-amber-400 font-mono">
                        {(closestMerra2.weight * 100).toFixed(1)}%
                      </strong>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                      <span>Coord do nó:</span>
                      <span className="font-mono">{closestMerra2.latitude.toFixed(4)}, {closestMerra2.longitude.toFixed(4)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Nenhum nó MERRA-2 carregado</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Weighting Breakdown of the 4 Nodes */}
          {activeNodes.length === 4 && (
            <div className={`p-3 rounded-xl border ${
              isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-zinc-950/40 border-zinc-800'
            } text-xs space-y-2`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-zinc-300">
                  Composição dos 4 Nós da Grade {modelToExtrapolate} para o Ponto:
                </span>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                  Coord: {substation.latitude.toFixed(4)}, {substation.longitude.toFixed(4)}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                {activeNodes.map((n) => (
                  <div
                    key={n.node_id}
                    className={`p-2 rounded-lg border ${
                      isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'
                    }`}
                  >
                    <div className="font-bold text-slate-900 dark:text-white">Nó {n.position}</div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400">{n.distance_km} km</div>
                    <div className={`text-xs font-mono font-bold mt-1 ${
                      modelToExtrapolate === 'ERA5' ? 'text-cyan-600 dark:text-cyan-400' : 'text-amber-600 dark:text-amber-400'
                    }`}>
                      {(n.weight * 100).toFixed(1)}% peso
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Execution Button & Status */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isExtrapolating}
                onClick={() => onRunExtrapolation(modelToExtrapolate)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all text-white ${
                  modelToExtrapolate === 'ERA5'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-600/30'
                    : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-600/30'
                } disabled:opacity-50`}
              >
                {isExtrapolating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>
                  {isExtrapolating
                    ? 'Processando Vetores dos 4 Nós...'
                    : hasExtrapolatedSeries
                    ? `Recalcular Extrapolação (${modelToExtrapolate})`
                    : `Sintetizar Extrapolação (${modelToExtrapolate})`}
                </span>
              </button>
            </div>

            {/* Toggle View: Show Synthesized Point vs Individual Nodes */}
            {hasExtrapolatedSeries && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Visualização Ativa nos Gráficos:
                </span>
                <button
                  type="button"
                  onClick={() => onToggleExtrapolatedActive(!isExtrapolatedActive)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    isExtrapolatedActive
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                      : isLight
                      ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                      : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>
                    {isExtrapolatedActive
                      ? 'Ponto Extrapolado (Sintetizado)'
                      : 'Nó Individual da Grade'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Details Pill when Extrapolated */}
          {hasExtrapolatedSeries && extrapolationDetails && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400 pt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>
                Série horária calculada e persistida em Parquet com sucesso (
                {extrapolationDetails.recordsCount?.toLocaleString('pt-BR')} horas
                {extrapolationDetails.fileSizeMb ? ` • ${extrapolationDetails.fileSizeMb} MB` : ''}).
              </span>
            </div>
          )}

          {/* Direct link to methodology */}
          <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 text-[11px] text-slate-500 dark:text-zinc-500">
            <span>Para formulações matemáticas detalhadas (vetores u, v, ponderação IDW e geodésia), consulte o módulo <strong>Metodologia</strong>.</span>
          </div>
        </div>
      )}
    </div>
  );
};
