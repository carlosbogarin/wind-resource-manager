import React from 'react';
import type { MetMastLoadedDataset } from '../../types';
import {
  Calendar,
  Layers,
  Gauge,
  Compass,
  Thermometer,
  Activity,
  CheckCircle,
  HelpCircle,
  ArrowUpRight,
} from 'lucide-react';

interface MetMastDataTabProps {
  dataset: MetMastLoadedDataset | null;
  onNavigateToQC: () => void;
  onNavigateToAnalysis: () => void;
  theme?: 'light' | 'dark';
}

const ROLE_LABELS: Record<string, string> = {
  speed: 'Velocidade',
  direction: 'Direção',
  speed_std: 'Desvio Padrão',
  speed_max: 'Rajada Máx.',
  speed_min: 'Velocidade Mín.',
  temperature: 'Temperatura',
  humidity: 'Umidade Rel.',
  pressure: 'Pressão Atm.',
  battery: 'Tensão / Bateria',
  other: 'Outro Canal',
};

export const MetMastDataTab: React.FC<MetMastDataTabProps> = ({
  dataset,
  onNavigateToQC,
  onNavigateToAnalysis,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';

  if (!dataset) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 dark:text-zinc-400">
        <Layers className="w-12 h-12 opacity-40 mb-3 animate-pulse" />
        <p className="text-sm font-medium">Nenhuma campanha anemométrica carregada</p>
        <p className="text-xs opacity-75 mt-1">Selecione ou envie um arquivo no seletor acima.</p>
      </div>
    );
  }

  const speedSensors = dataset.columns.filter((c) => c.role === 'speed');
  const dirSensors = dataset.columns.filter((c) => c.role === 'direction');
  const thermoBaroSensors = dataset.columns.filter((c) =>
    ['temperature', 'pressure', 'humidity'].includes(c.role)
  );

  const primaryAnemometer = [...speedSensors].sort((a, b) => (b.height || 0) - (a.height || 0))[0];
  const primaryStats = primaryAnemometer ? dataset.stats[primaryAnemometer.name] : null;

  const cardClass = isLight
    ? 'bg-white border-slate-200 shadow-sm'
    : 'bg-zinc-900 border-zinc-800 shadow-sm';

  return (
    <div className="space-y-6">
      {/* Linha de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Período */}
        <div className={`border rounded-2xl p-4 ${cardClass}`}>
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Período de Medição</span>
            <Calendar className="w-4 h-4 text-cyan-500" />
          </div>
          <div className={`text-xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {dataset.total_rows.toLocaleString('pt-BR')}{' '}
            <span className="text-xs font-normal text-slate-500 dark:text-zinc-400">registros</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-2 space-y-0.5">
            <div>
              <span className="opacity-70">Início:</span> {dataset.start_time.split(' ')[0]}
            </div>
            <div>
              <span className="opacity-70">Fim:</span> {dataset.end_time.split(' ')[0]}
            </div>
            <div className="text-cyan-600 dark:text-cyan-400 font-medium">
              Resolução: {dataset.sampling_interval_min} minutos
            </div>
          </div>
        </div>

        {/* KPI 2: Velocidade Média Topo */}
        <div className={`border rounded-2xl p-4 ${cardClass}`}>
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Velocidade Média Topo</span>
            <Gauge className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
            {primaryStats?.mean ?? '—'}{' '}
            <span className="text-xs font-normal text-slate-500 dark:text-zinc-400">m/s</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-2 space-y-0.5">
            <div className="truncate">
              <span className="opacity-70">Sensor:</span> {primaryAnemometer?.name ?? '—'}
            </div>
            <div>
              <span className="opacity-70">Cota:</span>{' '}
              {primaryAnemometer?.height ? `${primaryAnemometer.height} m` : 'N/A'}
            </div>
            <div>
              <span className="opacity-70">Máx / Mín:</span> {primaryStats?.max ?? '—'} /{' '}
              {primaryStats?.min ?? '—'} m/s
            </div>
          </div>
        </div>

        {/* KPI 3: Sensores Instalados */}
        <div className={`border rounded-2xl p-4 ${cardClass}`}>
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Sensores Mapeados</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className={`text-xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {dataset.columns.length}{' '}
            <span className="text-xs font-normal text-slate-500 dark:text-zinc-400">canais</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-2 space-y-0.5">
            <div>
              <span className="opacity-70">Anemômetros:</span> {speedSensors.length} canais
            </div>
            <div>
              <span className="opacity-70">Palhetas (Direção):</span> {dirSensors.length} canais
            </div>
            <div>
              <span className="opacity-70">Termo-barometria:</span> {thermoBaroSensors.length} canais
            </div>
          </div>
        </div>

        {/* KPI 4: Fluxo de Trabalho */}
        <div
          className={`rounded-2xl p-4 border flex flex-col justify-between ${
            isLight
              ? 'bg-gradient-to-br from-cyan-50 via-white to-white border-cyan-200'
              : 'bg-gradient-to-br from-cyan-950/30 via-zinc-900 to-zinc-900 border-cyan-800/40'
          }`}
        >
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-1 flex items-center space-x-1">
              <Activity className="w-3.5 h-3.5" />
              <span>Fluxo de Trabalho</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
              Canais classificados automaticamente via BrightWind. Prossiga para filtragem QC ou diagnósticos IEC.
            </p>
          </div>
          <div className="flex space-x-2 mt-3">
            <button
              type="button"
              onClick={onNavigateToQC}
              className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center justify-center space-x-1 transition-colors shadow-sm cursor-pointer"
            >
              <span>Ir para QC</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onNavigateToAnalysis}
              className={`text-xs font-semibold py-1.5 px-3 rounded-lg border transition-colors cursor-pointer ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
              }`}
            >
              Análises
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Sensores & Disponibilidade */}
      <div className={`border rounded-2xl overflow-hidden ${cardClass}`}>
        <div
          className={`px-5 py-4 border-b flex flex-wrap items-center justify-between gap-2 ${
            isLight ? 'border-slate-200' : 'border-zinc-800'
          }`}
        >
          <div>
            <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Mapeamento de Sensores & Disponibilidade (Coverage)
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Cotas de altura e orientações dos braços (booms) identificadas pelo motor analítico BrightWind
            </p>
          </div>
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full flex items-center space-x-1">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Mapeamento Ativo</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead
              className={`uppercase tracking-wider border-b font-semibold text-[11px] ${
                isLight
                  ? 'bg-slate-50 text-slate-500 border-slate-200'
                  : 'bg-zinc-950/70 text-zinc-400 border-zinc-800'
              }`}
            >
              <tr>
                <th className="px-5 py-3">Canal / Sensor</th>
                <th className="px-4 py-3">Classificação</th>
                <th className="px-4 py-3">Cota (m)</th>
                <th className="px-4 py-3">Orientação</th>
                <th className="px-5 py-3 w-48">Disponibilidade</th>
                <th className="px-4 py-3 text-right">Média</th>
                <th className="px-4 py-3 text-right">Mínimo</th>
                <th className="px-4 py-3 text-right">Máximo</th>
                <th className="px-5 py-3 text-right">Desvio Padrão</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-zinc-800/60'}`}>
              {dataset.columns.map((col) => {
                const stat = dataset.stats[col.name];
                const coverage = stat?.coverage_pct ?? 0;

                let roleColor = isLight
                  ? 'bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700';
                let RoleIcon = HelpCircle;

                if (col.role === 'speed') {
                  roleColor = 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30';
                  RoleIcon = Gauge;
                } else if (col.role === 'direction') {
                  roleColor = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
                  RoleIcon = Compass;
                } else if (col.role === 'temperature') {
                  roleColor = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
                  RoleIcon = Thermometer;
                } else if (col.role === 'speed_std') {
                  roleColor = 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30';
                  RoleIcon = Activity;
                }

                return (
                  <tr
                    key={col.name}
                    className={`transition-colors ${
                      isLight ? 'hover:bg-slate-50' : 'hover:bg-zinc-800/30'
                    }`}
                  >
                    <td className={`px-5 py-3 font-mono font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {col.name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] border ${roleColor}`}
                      >
                        <RoleIcon className="w-3 h-3" />
                        <span>{ROLE_LABELS[col.role] || col.role}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {col.height !== null ? (
                        <span
                          className={`px-2 py-0.5 rounded border font-mono text-[11px] ${
                            isLight
                              ? 'bg-slate-100 border-slate-200 text-slate-800'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-200'
                          }`}
                        >
                          {col.height} m
                        </span>
                      ) : (
                        <span className="opacity-40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {col.orientation ? (
                        <span
                          className={`px-2 py-0.5 rounded font-mono text-[11px] ${
                            isLight ? 'bg-slate-100 text-slate-700' : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {col.orientation}
                        </span>
                      ) : (
                        <span className="opacity-40">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center space-x-2">
                        <div
                          className={`flex-1 rounded-full h-1.5 overflow-hidden ${
                            isLight ? 'bg-slate-200' : 'bg-zinc-800'
                          }`}
                        >
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              coverage >= 90
                                ? 'bg-emerald-500'
                                : coverage >= 70
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, coverage))}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] w-11 text-right">{coverage}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium">
                      {stat?.mean !== null && stat?.mean !== undefined ? `${stat.mean} ${col.unit}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono opacity-75">
                      {stat?.min !== null && stat?.min !== undefined ? `${stat.min} ${col.unit}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono opacity-75">
                      {stat?.max !== null && stat?.max !== undefined ? `${stat.max} ${col.unit}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-right font-mono opacity-75">
                      {stat?.std !== null && stat?.std !== undefined ? `${stat.std} ${col.unit}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
