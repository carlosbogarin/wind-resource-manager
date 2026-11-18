import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { Sliders, CheckCircle2, Play, RotateCcw, Info, AlertCircle } from 'lucide-react';
import type { MetMastLoadedDataset, MetMastQCResult, MetMastTimeseriesResponse } from '../../types';
import {
  applyMetMastQCRules,
  resetMetMastQCRules,
  fetchMetMastTimeseries,
} from '../../services/api';

interface MetMastQCTabProps {
  dataset: MetMastLoadedDataset | null;
  onQcStatusChanged?: (result: MetMastQCResult | null) => void;
  theme?: 'light' | 'dark';
}

export const MetMastQCTab: React.FC<MetMastQCTabProps> = ({
  dataset,
  onQcStatusChanged,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';

  const speedCols = dataset?.columns.filter((c) => c.role === 'speed').map((c) => c.name) || [];
  const dirCols = dataset?.columns.filter((c) => c.role === 'direction').map((c) => c.name) || [];
  const tempCols = dataset?.columns.filter((c) => c.role === 'temperature').map((c) => c.name) || [];
  const stdCols = dataset?.columns.filter((c) => c.role === 'speed_std').map((c) => c.name) || [];

  const [selectedSpeedCol, setSelectedSpeedCol] = useState<string>(speedCols[0] || '');
  const [selectedSecondaryCol, setSelectedSecondaryCol] = useState<string>(speedCols[1] || '');
  const [selectedDirCol, setSelectedDirCol] = useState<string>(dirCols[0] || '');
  const [selectedTempCol, setSelectedTempCol] = useState<string>(tempCols[0] || '');
  const [selectedStdCol, setSelectedStdCol] = useState<string>(stdCols[0] || '');

  const [minSpeed, setMinSpeed] = useState<number>(0.2);
  const [maxSpeed, setMaxSpeed] = useState<number>(45.0);
  const [enableMastShadow, setEnableMastShadow] = useState<boolean>(true);
  const [shadowStart, setShadowStart] = useState<number>(160);
  const [shadowEnd, setShadowEnd] = useState<number>(200);
  const [enableIcing, setEnableIcing] = useState<boolean>(false);
  const [minTempIcing, setMinTempIcing] = useState<number>(0.0);
  const [minStdFrozen, setMinStdFrozen] = useState<number>(0.05);

  const [qcResult, setQcResult] = useState<MetMastQCResult | null>(dataset?.qc_summary || null);
  const [timeseriesData, setTimeseriesData] = useState<MetMastTimeseriesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const nextPrimary = speedCols.includes(selectedSpeedCol) ? selectedSpeedCol : speedCols[0] || '';
    const nextSecondary =
      selectedSecondaryCol && speedCols.includes(selectedSecondaryCol)
        ? selectedSecondaryCol
        : speedCols[1] || '';
    const nextDir = dirCols.includes(selectedDirCol) ? selectedDirCol : dirCols[0] || '';
    const nextTemp = tempCols.includes(selectedTempCol) ? selectedTempCol : tempCols[0] || '';
    const nextStd = stdCols.includes(selectedStdCol) ? selectedStdCol : stdCols[0] || '';

    setSelectedSpeedCol(nextPrimary);
    setSelectedSecondaryCol(nextSecondary);
    setSelectedDirCol(nextDir);
    setSelectedTempCol(nextTemp);
    setSelectedStdCol(nextStd);
    setQcResult(dataset?.qc_summary || null);
    setError(null);
  }, [dataset?.dataset_id]);

  const loadChartData = async () => {
    if (!selectedSpeedCol || !dataset) {
      setTimeseriesData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const activeCols = [selectedSpeedCol];
      if (selectedSecondaryCol && selectedSecondaryCol !== selectedSpeedCol) {
        activeCols.push(selectedSecondaryCol);
      }
      const data = await fetchMetMastTimeseries(activeCols, 1800, undefined, undefined, dataset.dataset_id);
      setTimeseriesData(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Falha ao carregar série temporal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChartData();
  }, [dataset?.dataset_id, selectedSpeedCol, selectedSecondaryCol]);

  const handleApplyQC = async () => {
    if (!selectedSpeedCol || !dataset) return;
    setLoading(true);
    setError(null);
    try {
      const res = await applyMetMastQCRules({
        speed_col: selectedSpeedCol,
        min_speed: minSpeed,
        max_speed: maxSpeed,
        direction_col: enableMastShadow && selectedDirCol ? selectedDirCol : undefined,
        shadow_sector_start: enableMastShadow ? shadowStart : undefined,
        shadow_sector_end: enableMastShadow ? shadowEnd : undefined,
        temp_col: enableIcing && selectedTempCol ? selectedTempCol : undefined,
        min_temp_icing: enableIcing ? minTempIcing : undefined,
        std_col: enableIcing && selectedStdCol ? selectedStdCol : undefined,
        min_std_frozen: enableIcing ? minStdFrozen : undefined,
        dataset_id: dataset.dataset_id,
      });
      setQcResult(res);
      onQcStatusChanged?.(res);
      await loadChartData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Erro ao aplicar regras de QC.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetQC = async () => {
    if (!dataset) return;
    setLoading(true);
    setError(null);
    try {
      await resetMetMastQCRules(dataset.dataset_id);
      setQcResult(null);
      onQcStatusChanged?.(null);
      await loadChartData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Erro ao limpar filtros de QC.');
    } finally {
      setLoading(false);
    }
  };

  const getEChartsOption = () => {
    if (!timeseriesData) return {};

    const seriesList: any[] = [];
    if (timeseriesData.series[selectedSpeedCol]) {
      seriesList.push({
        name: selectedSpeedCol,
        type: 'line',
        showSymbol: false,
        sampling: 'lttb',
        lineStyle: { width: 1.5, color: '#06b6d4' },
        itemStyle: { color: '#06b6d4' },
        data: timeseriesData.series[selectedSpeedCol],
      });
    }

    if (selectedSecondaryCol && timeseriesData.series[selectedSecondaryCol]) {
      seriesList.push({
        name: selectedSecondaryCol,
        type: 'line',
        showSymbol: false,
        sampling: 'lttb',
        lineStyle: { width: 1.2, color: '#a855f7', type: 'dashed' },
        itemStyle: { color: '#a855f7' },
        data: timeseriesData.series[selectedSecondaryCol],
      });
    }

    const axisLineColor = isLight ? '#cbd5e1' : '#3f3f46';
    const labelColor = isLight ? '#475569' : '#a1a1aa';
    const splitLineColor = isLight ? '#e2e8f0' : '#27272a';

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross', label: { backgroundColor: isLight ? '#334155' : '#27272a' } },
        backgroundColor: isLight ? '#ffffff' : '#18181b',
        borderColor: isLight ? '#e2e8f0' : '#27272a',
        textStyle: { color: isLight ? '#0f172a' : '#f4f4f5', fontSize: 12 },
      },
      legend: {
        data: [selectedSpeedCol, selectedSecondaryCol].filter(Boolean),
        textStyle: { color: labelColor, fontSize: 11 },
        top: 0,
        right: 16,
      },
      grid: {
        left: '3%',
        right: '3%',
        bottom: '16%',
        top: '12%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: timeseriesData.timestamps,
        boundaryGap: false,
        axisLine: { lineStyle: { color: axisLineColor } },
        axisLabel: { color: labelColor, fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        name: 'Velocidade (m/s)',
        nameTextStyle: { color: labelColor, fontSize: 11 },
        splitLine: { lineStyle: { color: splitLineColor, type: 'dashed' } },
        axisLabel: { color: labelColor, fontSize: 11 },
      },
      dataZoom: [
        {
          type: 'slider',
          show: true,
          xAxisIndex: [0],
          bottom: 10,
          borderColor: axisLineColor,
          fillerColor: 'rgba(6, 182, 212, 0.15)',
          textStyle: { color: labelColor },
          handleStyle: { color: '#06b6d4' },
        },
        {
          type: 'inside',
          xAxisIndex: [0],
        },
      ],
      series: seriesList,
    };
  };

  const cardClass = isLight
    ? 'bg-white border-slate-200 shadow-sm'
    : 'bg-zinc-900 border-zinc-800 shadow-sm';
  const selectClass = isLight
    ? 'w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-2 focus:ring-1 focus:ring-cyan-500 focus:outline-none'
    : 'w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-lg p-2 focus:ring-1 focus:ring-cyan-500 focus:outline-none';
  const inputClass = isLight
    ? 'w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-1.5 font-mono'
    : 'w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-lg p-1.5 font-mono';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Barra Lateral de Regras de QC */}
      <div className={`lg:col-span-1 border rounded-2xl p-5 space-y-5 ${cardClass}`}>
        <div
          className={`flex items-center space-x-2 border-b pb-3 ${
            isLight ? 'border-slate-200' : 'border-zinc-800'
          }`}
        >
          <Sliders className="w-4 h-4 text-cyan-500" />
          <h3 className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Motor de Regras QC
          </h3>
        </div>

        {/* Seleção de Canais */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 block mb-1">
              Anemômetro Principal
            </label>
            <select
              value={selectedSpeedCol}
              onChange={(e) => setSelectedSpeedCol(e.target.value)}
              className={selectClass}
            >
              {speedCols.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 block mb-1">
              Anemômetro de Comparação
            </label>
            <select
              value={selectedSecondaryCol}
              onChange={(e) => setSelectedSecondaryCol(e.target.value)}
              className={selectClass}
            >
              <option value="">(Nenhum)</option>
              {speedCols.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 block mb-1">
              Palheta de Direção
            </label>
            <select
              value={selectedDirCol}
              onChange={(e) => setSelectedDirCol(e.target.value)}
              className={selectClass}
            >
              {dirCols.length === 0 && <option value="">(Sem palheta)</option>}
              {dirCols.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Regra 1: Limites de Velocidade */}
        <div className={`border-t pt-3 space-y-2 ${isLight ? 'border-slate-200' : 'border-zinc-800/80'}`}>
          <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block">
            Limites Físicos de Velocidade (m/s)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-500 dark:text-zinc-500">Mínimo</span>
              <input
                type="number"
                step="0.1"
                value={minSpeed}
                onChange={(e) => setMinSpeed(parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 dark:text-zinc-500">Máximo</span>
              <input
                type="number"
                step="1"
                value={maxSpeed}
                onChange={(e) => setMaxSpeed(parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Regra 2: Sombra de Torre */}
        <div className={`border-t pt-3 space-y-2 ${isLight ? 'border-slate-200' : 'border-zinc-800/80'}`}>
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Sombra de Torre (Mast Shadow)
            </label>
            <input
              type="checkbox"
              checked={enableMastShadow}
              onChange={(e) => setEnableMastShadow(e.target.checked)}
              className="accent-cyan-500 cursor-pointer"
            />
          </div>
          {enableMastShadow && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-zinc-500">Setor Início (°)</span>
                <input
                  type="number"
                  value={shadowStart}
                  onChange={(e) => setShadowStart(parseFloat(e.target.value) || 0)}
                  className={inputClass}
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-zinc-500">Setor Fim (°)</span>
                <input
                  type="number"
                  value={shadowEnd}
                  onChange={(e) => setShadowEnd(parseFloat(e.target.value) || 0)}
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </div>

        {/* Regra 3: Gelo e Sensor Travado */}
        <div className={`border-t pt-3 space-y-2 ${isLight ? 'border-slate-200' : 'border-zinc-800/80'}`}>
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Gelo / Sensor Travado
            </label>
            <input
              type="checkbox"
              checked={enableIcing}
              onChange={(e) => setEnableIcing(e.target.checked)}
              className="accent-cyan-500 cursor-pointer"
            />
          </div>
          {enableIcing && (
            <div className="space-y-2 pt-1">
              {tempCols.length === 0 || stdCols.length === 0 ? (
                <p className="text-[11px] text-amber-500">
                  Requer canais de temperatura e desvio padrão para detecção combinada.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-500">Temp Máx (°C)</span>
                    <input
                      type="number"
                      value={minTempIcing}
                      onChange={(e) => setMinTempIcing(parseFloat(e.target.value) || 0)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-500">Std Mín (m/s)</span>
                    <input
                      type="number"
                      step="0.01"
                      value={minStdFrozen}
                      onChange={(e) => setMinStdFrozen(parseFloat(e.target.value) || 0)}
                      className={inputClass}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botões */}
        <div className="pt-2 space-y-2">
          <button
            type="button"
            onClick={handleApplyQC}
            disabled={loading || !selectedSpeedCol}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md shadow-cyan-600/20 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{loading ? 'Calculando...' : 'Aplicar Regras de QC'}</span>
          </button>

          {qcResult && (
            <button
              type="button"
              onClick={handleResetQC}
              disabled={loading}
              className={`w-full text-xs font-semibold py-2 px-4 rounded-xl flex items-center justify-center space-x-1.5 border transition-colors cursor-pointer ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar Filtros QC</span>
            </button>
          )}
        </div>
      </div>

      {/* Área Principal: Banner QC + Série Temporal */}
      <div className="lg:col-span-3 space-y-4">
        {error && (
          <div className="flex items-center space-x-2 text-rose-500 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {qcResult && (
          <div className={`border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 ${cardClass}`}>
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Controle de Qualidade Aplicado
                </div>
                <div className="text-xs text-slate-500 dark:text-zinc-400">
                  {qcResult.valid_points.toLocaleString('pt-BR')} registros válidos ({qcResult.valid_pct}%) de{' '}
                  {qcResult.total_points.toLocaleString('pt-BR')}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <div
                className={`border px-3 py-1.5 rounded-lg ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-800'
                }`}
              >
                <span className="text-slate-500 dark:text-zinc-500">Limites Velocidade:</span>{' '}
                <span className="text-rose-500 font-mono font-semibold">
                  {qcResult.flagged_by_rule.speed_out_of_bounds ?? 0}
                </span>
              </div>

              {qcResult.flagged_by_rule.mast_shadow_sector !== undefined && (
                <div
                  className={`border px-3 py-1.5 rounded-lg ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-800'
                  }`}
                >
                  <span className="text-slate-500 dark:text-zinc-500">Sombra de Torre:</span>{' '}
                  <span className="text-amber-500 font-mono font-semibold">
                    {qcResult.flagged_by_rule.mast_shadow_sector}
                  </span>
                </div>
              )}

              {qcResult.flagged_by_rule.icing_frozen_sensor !== undefined && (
                <div
                  className={`border px-3 py-1.5 rounded-lg ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-800'
                  }`}
                >
                  <span className="text-slate-500 dark:text-zinc-500">Gelo/Travamento:</span>{' '}
                  <span className="text-cyan-500 font-mono font-semibold">
                    {qcResult.flagged_by_rule.icing_frozen_sensor}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className={`border rounded-2xl p-4 ${cardClass}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-2">
            <div className="flex items-center space-x-2">
              <h4 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Série Temporal Interativa da Torre
              </h4>
              {timeseriesData && (
                <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                  ({timeseriesData.total_raw_points.toLocaleString('pt-BR')} pontos brutos • exibindo{' '}
                  {timeseriesData.sampled_points.toLocaleString('pt-BR')})
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-zinc-400">
              <Info className="w-3.5 h-3.5 text-cyan-500" />
              <span>Arraste o slider inferior ou use o scroll para zoom</span>
            </div>
          </div>

          <div className="h-[460px] w-full">
            {timeseriesData && timeseriesData.timestamps.length > 0 ? (
              <ReactECharts
                option={getEChartsOption()}
                style={{ height: '100%', width: '100%' }}
                notMerge={true}
                lazyUpdate={true}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 dark:text-zinc-500 text-xs">
                {loading ? 'Carregando série temporal...' : 'Selecione um canal de velocidade para visualizar.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
