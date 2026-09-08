import React, { useState } from 'react';
import {
  Trophy,
  Award,
  Sparkles,
  Layers,
  Check,
  ChevronRight,
  TrendingUp,
  Table,
  Info,
  Zap,
} from 'lucide-react';
import {
  CorrelationMatrixResponse,
  SeriesCorrelationRow,
  PlantCorrelationMetric,
} from '../types';

interface ReanalysisRankingTableProps {
  data?: CorrelationMatrixResponse;
  isLoading: boolean;
  selectedNodeId?: string;
  isExtrapolatedActive: boolean;
  onSelectSeries: (series: SeriesCorrelationRow) => void;
  theme?: 'light' | 'dark';
}

export const ReanalysisRankingTable: React.FC<ReanalysisRankingTableProps> = ({
  data,
  isLoading,
  selectedNodeId,
  isExtrapolatedActive,
  onSelectSeries,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [hoveredPlant, setHoveredPlant] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div
        className={`p-6 rounded-2xl border animate-pulse ${
          isLight ? 'bg-white border-slate-200' : 'bg-zinc-950 border-zinc-800'
        }`}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20" />
          <div className="h-6 w-72 rounded bg-slate-200 dark:bg-zinc-800" />
        </div>
        <div className="h-4 w-96 rounded bg-slate-100 dark:bg-zinc-800/60 mb-6" />
        <div className="space-y-3">
          <div className="h-10 rounded-lg bg-slate-100 dark:bg-zinc-900" />
          <div className="h-12 rounded-lg bg-slate-100 dark:bg-zinc-900/60" />
          <div className="h-12 rounded-lg bg-slate-100 dark:bg-zinc-900/60" />
        </div>
      </div>
    );
  }

  if (!data || !data.has_data || data.series.length === 0) {
    return null;
  }

  const { plants, series, best_per_plant, global_champion } = data;

  // Helper para verificar se a linha está ativa
  const isRowActive = (s: SeriesCorrelationRow) => {
    if (s.series_type === 'synthetic') {
      return isExtrapolatedActive && selectedNodeId === s.series_id;
    }
    return !isExtrapolatedActive && selectedNodeId === s.series_id;
  };

  return (
    <div
      className={`rounded-2xl border p-5 transition-all shadow-sm ${
        isLight
          ? 'bg-white border-slate-200 shadow-slate-100'
          : 'bg-zinc-950 border-zinc-800 shadow-black/40'
      }`}
    >
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-2 flex-wrap">
                <span>Matriz Comparativa de Correlação & Ranking de Reanálises</span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  {series.length} séries em cache
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 font-mono">
                  Algoritmo: LLS (Linear Least Squares)
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Desempenho correlativo concomitante (MCP) via <strong>Mínimos Quadrados Lineares (LLS)</strong> das séries de reanálise contra as medições anemométricas reais de cada parque do conjunto
              </p>
            </div>
          </div>
        </div>

        {/* Global Champion Callout Pill */}
        {global_champion && (
          <div
            className={`flex items-center gap-3 px-3.5 py-2 rounded-xl border transition-all ${
              isLight
                ? 'bg-amber-50/70 border-amber-200/80 text-amber-950'
                : 'bg-amber-500/10 border-amber-500/25 text-amber-200'
            }`}
          >
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-500">
              <Trophy className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <div className="font-semibold flex items-center gap-1.5">
                <span>Campeão Global:</span>
                <span className="text-amber-600 dark:text-amber-400 font-bold">
                  {global_champion.series_name}
                </span>
              </div>
              <div className="text-[11px] opacity-80 flex items-center gap-2">
                <span>Score R: <strong>{global_champion.global_score.toFixed(4)}</strong></span>
                <span>•</span>
                <span>{global_champion.wins_count} {global_champion.wins_count === 1 ? 'vitória' : 'vitórias'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Table Container */}
      <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-zinc-800">
        <table className="w-full text-left text-xs border-collapse min-w-[700px]">
          <thead>
            <tr
              className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                isLight
                  ? 'bg-slate-50/80 text-slate-600 border-slate-200'
                  : 'bg-zinc-900/60 text-zinc-400 border-zinc-800'
              }`}
            >
              <th className="py-3 px-3.5 w-60">Série de Reanálise</th>
              <th className="py-3 px-3 w-28">Distância</th>

              {plants.map((plant) => {
                const isEnsembleMean = plant === 'Média do Conjunto';
                return (
                  <th
                    key={plant}
                    onMouseEnter={() => setHoveredPlant(plant)}
                    onMouseLeave={() => setHoveredPlant(null)}
                    className={`py-3 px-3 transition-colors ${
                      isEnsembleMean
                        ? isLight
                          ? 'bg-cyan-50/70 text-cyan-900 border-x border-slate-200'
                          : 'bg-cyan-950/20 text-cyan-300 border-x border-zinc-800'
                        : hoveredPlant === plant
                        ? isLight
                          ? 'bg-emerald-50/40 text-emerald-900'
                          : 'bg-emerald-950/20 text-emerald-300'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="truncate max-w-[130px]" title={plant}>
                        {plant}
                      </span>
                      {isEnsembleMean && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30">
                          Geral
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}

              <th className="py-3 px-3 w-32 text-center">Score Global (R)</th>
              <th className="py-3 px-3 w-24 text-center">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
            {series.map((s, idx) => {
              const active = isRowActive(s);
              const isChamp = global_champion?.series_id === s.series_id;

              return (
                <tr
                  key={s.series_id}
                  onClick={() => onSelectSeries(s)}
                  className={`group cursor-pointer transition-colors ${
                    active
                      ? isLight
                        ? 'bg-emerald-50/70 font-medium'
                        : 'bg-emerald-950/20 font-medium'
                      : isChamp
                      ? isLight
                        ? 'bg-amber-50/30 hover:bg-amber-50/60'
                        : 'bg-amber-950/10 hover:bg-amber-950/20'
                      : isLight
                      ? 'hover:bg-slate-50'
                      : 'hover:bg-zinc-900/50'
                  }`}
                >
                  {/* Série Info */}
                  <td className="py-3 px-3.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-1.5 rounded-lg border shrink-0 ${
                          s.series_type === 'synthetic'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25'
                            : s.model === 'ERA5'
                            ? 'bg-cyan-500/10 text-cyan-500 border-cyan-500/25'
                            : 'bg-purple-500/10 text-purple-500 border-purple-500/25'
                        }`}
                      >
                        {s.series_type === 'synthetic' ? (
                          <Sparkles className="w-3.5 h-3.5" />
                        ) : (
                          <Layers className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-800 dark:text-zinc-200">
                            {s.series_name}
                          </span>
                          {isChamp && (
                            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 font-bold border border-amber-500/30 inline-flex items-center gap-0.5">
                              <Trophy className="w-2.5 h-2.5" /> 1º Global
                            </span>
                          )}
                          {active && (
                            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-bold border border-emerald-500/30">
                              Ativo
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">
                          <span
                            className={`px-1 py-0.2 rounded font-mono ${
                              s.model === 'ERA5'
                                ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300'
                                : 'bg-purple-500/10 text-purple-600 dark:text-purple-300'
                            }`}
                          >
                            {s.model}
                          </span>
                          <span>•</span>
                          <span>
                            {s.series_type === 'synthetic'
                              ? 'Extrapolação Horizontal'
                              : `Nó ${s.position} (${s.cardinal_direction})`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Distância */}
                  <td className="py-3 px-3">
                    <span className="font-mono text-slate-600 dark:text-zinc-300">
                      {s.distance_km === 0
                        ? '0.0 km (Alvo)'
                        : `${s.distance_km.toFixed(1)} km`}
                    </span>
                  </td>

                  {/* Colunas por Usina */}
                  {plants.map((plant) => {
                    const metric: PlantCorrelationMetric | undefined =
                      s.metrics_by_plant[plant];
                    const isBest = metric?.is_best;
                    const isEnsembleMean = plant === 'Média do Conjunto';

                    return (
                      <td
                        key={plant}
                        className={`py-3 px-3 transition-colors ${
                          isEnsembleMean
                            ? isLight
                              ? 'border-x border-slate-200/80 bg-slate-50/30'
                              : 'border-x border-zinc-800/80 bg-zinc-900/20'
                            : ''
                        }`}
                      >
                        {metric && metric.r !== null ? (
                          <div
                            className={`relative rounded-lg px-2.5 py-1.5 transition-all ${
                              isBest
                                ? isLight
                                  ? 'bg-emerald-100/70 border border-emerald-400 text-emerald-950 font-bold shadow-sm'
                                  : 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 font-bold shadow-sm'
                                : 'text-slate-700 dark:text-zinc-300'
                            }`}
                            title={`R: ${metric.r.toFixed(4)} | R²: ${(
                              (metric.r_squared || 0) * 100
                            ).toFixed(1)}% | RMSE: ${metric.rmse} m/s | Bias: ${
                              metric.bias
                            } m/s | ${metric.n_samples.toLocaleString('pt-BR')} amostras`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`font-mono text-xs ${
                                  isBest
                                    ? 'text-emerald-700 dark:text-emerald-300 font-bold'
                                    : ''
                                }`}
                              >
                                {metric.r.toFixed(4)}
                              </span>
                              {isBest && (
                                <span className="flex items-center gap-0.5 text-[9px] uppercase tracking-wider px-1 py-0.2 rounded bg-emerald-500/30 text-emerald-800 dark:text-emerald-200 font-bold border border-emerald-500/40">
                                  <Award className="w-2.5 h-2.5" /> 1º
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono opacity-80 mt-0.5">
                              R²: {((metric.r_squared || 0) * 100).toFixed(1)}%
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-zinc-600 font-mono text-[11px]">
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}

                  {/* Score Global */}
                  <td className="py-3 px-3 text-center">
                    {s.global_score !== null ? (
                      <div className="inline-flex flex-col items-center">
                        <span
                          className={`font-mono font-bold text-xs ${
                            isChamp
                              ? 'text-amber-600 dark:text-amber-400 text-sm font-black'
                              : 'text-slate-800 dark:text-zinc-200'
                          }`}
                        >
                          {s.global_score.toFixed(4)}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">
                          {s.wins_count}{' '}
                          {s.wins_count === 1 ? 'vitória' : 'vitórias'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 dark:text-zinc-600 font-mono text-[11px]">
                        —
                      </span>
                    )}
                  </td>

                  {/* Ação / Seleção */}
                  <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onSelectSeries(s)}
                      className={`inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        active
                          ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                          : isLight
                          ? 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200'
                          : 'bg-zinc-900 text-zinc-300 hover:bg-emerald-950/40 hover:text-emerald-300 border border-zinc-800'
                      }`}
                      title={active ? 'Série selecionada atualmente' : 'Ativar esta série nos gráficos'}
                    >
                      {active ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Ativo</span>
                        </>
                      ) : (
                        <>
                          <ChevronRight className="w-3.5 h-3.5" />
                          <span>Ver</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend and Footnote */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/80 text-[11px] text-slate-500 dark:text-zinc-400">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/60 inline-block" />
            <span>
              <strong>1º Lugar Colunar:</strong> Melhor reanálise para o parque específico
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3 h-3 text-amber-500" />
            <span>
              <strong>Campeão Global:</strong> Maior correlação média entre as usinas
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.2 rounded font-mono text-[9px] bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 font-bold">
              LLS
            </span>
            <span>
              <strong>Algoritmo:</strong> Mínimos Quadrados Lineares (Linear Least Squares)
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 italic opacity-80">
          <Info className="w-3 h-3" />
          <span>Clique em qualquer linha da tabela para carregá-la imediatamente nos gráficos.</span>
        </div>
      </div>
    </div>
  );
};
