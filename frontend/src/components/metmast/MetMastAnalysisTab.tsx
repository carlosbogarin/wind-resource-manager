import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Compass,
  TrendingUp,
  Activity,
  Calendar,
  BarChart3,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import type {
  MetMastLoadedDataset,
  MetMastWindRoseData,
  MetMastWindShearData,
  MetMastTurbulenceData,
  MetMast12x24Data,
  MetMastWeibullData,
} from '../../types';
import {
  fetchMetMastWindRose,
  fetchMetMastWindShear,
  fetchMetMastTurbulence,
  fetchMetMast12x24,
  fetchMetMastWeibull,
} from '../../services/api';

interface MetMastAnalysisTabProps {
  dataset: MetMastLoadedDataset | null;
  qcVersion?: number;
  theme?: 'light' | 'dark';
}

export const MetMastAnalysisTab: React.FC<MetMastAnalysisTabProps> = ({
  dataset,
  qcVersion = 0,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [subTab, setSubTab] = useState<'rose' | 'shear' | 'ti' | '12x24' | 'weibull'>('rose');

  const speedCols = dataset?.columns.filter((c) => c.role === 'speed') || [];
  const dirCols = dataset?.columns.filter((c) => c.role === 'direction') || [];
  const stdCols = dataset?.columns.filter((c) => c.role === 'speed_std') || [];

  const [selectedSpeedCol, setSelectedSpeedCol] = useState<string>(speedCols[0]?.name || '');
  const [selectedDirCol, setSelectedDirCol] = useState<string>(dirCols[0]?.name || '');
  const [selectedStdCol, setSelectedStdCol] = useState<string>(stdCols[0]?.name || '');
  const [sectors, setSectors] = useState<number>(16);
  const [applyQC, setApplyQC] = useState<boolean>(true);

  const [roseData, setRoseData] = useState<MetMastWindRoseData | null>(null);
  const [shearData, setShearData] = useState<MetMastWindShearData | null>(null);
  const [tiData, setTiData] = useState<MetMastTurbulenceData | null>(null);
  const [matrixData, setMatrixData] = useState<MetMast12x24Data | null>(null);
  const [weibullData, setWeibullData] = useState<MetMastWeibullData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedSpeedCol((prev) =>
      speedCols.some((c) => c.name === prev) ? prev : speedCols[0]?.name || ''
    );
    setSelectedDirCol((prev) =>
      dirCols.some((c) => c.name === prev) ? prev : dirCols[0]?.name || ''
    );
    setSelectedStdCol((prev) =>
      stdCols.some((c) => c.name === prev) ? prev : stdCols[0]?.name || ''
    );
    setRoseData(null);
    setShearData(null);
    setTiData(null);
    setMatrixData(null);
    setWeibullData(null);
    setError(null);
  }, [dataset?.dataset_id]);

  useEffect(() => {
    if (!selectedSpeedCol || !dataset) return;
    let cancelled = false;

    const loadData = async () => {
      setError(null);
      try {
        if (subTab === 'rose') {
          if (!selectedDirCol) {
            setRoseData(null);
            return;
          }
          const res = await fetchMetMastWindRose(
            selectedSpeedCol,
            selectedDirCol,
            sectors,
            applyQC,
            dataset.dataset_id
          );
          if (!cancelled) setRoseData(res);
        } else if (subTab === 'shear') {
          const anemometers = speedCols
            .filter((c) => c.height !== null)
            .map((c) => ({ column: c.name, height: c.height! }));
          const distinctHeights = new Set(anemometers.map((a) => a.height));
          if (distinctHeights.size < 2) {
            if (!cancelled) {
              setShearData(null);
              setError('São necessárias pelo menos 2 alturas distintas de anemômetros para calcular o cisalhamento vertical.');
            }
            return;
          }
          const res = await fetchMetMastWindShear(
            anemometers,
            [100, 120, 140, 160],
            3.0,
            applyQC,
            dataset.dataset_id
          );
          if (!cancelled) setShearData(res);
        } else if (subTab === 'ti') {
          if (!selectedStdCol) {
            setTiData(null);
            return;
          }
          const res = await fetchMetMastTurbulence(
            selectedSpeedCol,
            selectedStdCol,
            3.0,
            applyQC,
            dataset.dataset_id
          );
          if (!cancelled) setTiData(res);
        } else if (subTab === '12x24') {
          const res = await fetchMetMast12x24(selectedSpeedCol, applyQC, dataset.dataset_id);
          if (!cancelled) setMatrixData(res);
        } else if (subTab === 'weibull') {
          const res = await fetchMetMastWeibull(selectedSpeedCol, applyQC, dataset.dataset_id);
          if (!cancelled) setWeibullData(res);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.detail || err.message || 'Erro ao processar análise eólica.');
        }
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [
    dataset?.dataset_id,
    subTab,
    selectedSpeedCol,
    selectedDirCol,
    selectedStdCol,
    sectors,
    applyQC,
    qcVersion,
  ]);

  const axisLineColor = isLight ? '#cbd5e1' : '#3f3f46';
  const labelColor = isLight ? '#475569' : '#a1a1aa';
  const splitLineColor = isLight ? '#e2e8f0' : '#27272a';
  const tooltipBg = isLight ? '#ffffff' : '#18181b';
  const tooltipBorder = isLight ? '#e2e8f0' : '#27272a';
  const tooltipText = isLight ? '#0f172a' : '#f4f4f5';

  const getWindRoseOption = () => {
    if (!roseData) return {};
    const speedBinColors = ['#38bdf8', '#0284c7', '#22c55e', '#eab308', '#f97316', '#ef4444'];
    const angles = roseData.sector_data.map((s) => s.label);
    const series = roseData.speed_bin_labels.map((binLabel, binIdx) => ({
      type: 'bar',
      name: binLabel,
      coordinateSystem: 'polar',
      stack: 'wind_speed',
      color: speedBinColors[binIdx % speedBinColors.length],
      data: roseData.sector_data.map((s) => s.speed_bins[binIdx] || 0),
    }));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        textStyle: { color: tooltipText, fontSize: 12 },
      },
      legend: {
        data: roseData.speed_bin_labels,
        textStyle: { color: labelColor, fontSize: 11 },
        bottom: 0,
      },
      polar: { radius: ['12%', '74%'] },
      angleAxis: {
        type: 'category',
        data: angles,
        boundaryGap: false,
        splitLine: { show: true, lineStyle: { color: splitLineColor } },
        axisLine: { lineStyle: { color: axisLineColor } },
        axisLabel: { color: labelColor, fontSize: 11, fontWeight: 'bold' },
        startAngle: 90,
      },
      radiusAxis: {
        min: 0,
        splitLine: { lineStyle: { color: splitLineColor, type: 'dashed' } },
        axisLabel: { color: labelColor, fontSize: 10, formatter: '{value}%' },
      },
      series,
    };
  };

  const getWindShearOption = () => {
    if (!shearData) return {};
    const profileData = shearData.profile_curve.map((p) => [p.speed, p.height]);
    const measuredData = shearData.measured_points.map((p) => [p.speed, p.height, p.column]);
    const extrapData = shearData.extrapolated_hub_heights.map((p) => [p.power_law_speed, p.hub_height]);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.seriesName === 'Medições da Torre') {
            return `<b>${params.data[2]}</b><br/>Altura: ${params.data[1]} m<br/>Velocidade: ${params.data[0]} m/s`;
          }
          return `Altura: ${params.data[1]} m<br/>Velocidade: ${params.data[0]} m/s`;
        },
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        textStyle: { color: tooltipText, fontSize: 12 },
      },
      legend: {
        data: ['Perfil Ajustado (Power Law)', 'Medições da Torre', 'Extrapolação Hub Height'],
        textStyle: { color: labelColor, fontSize: 11 },
        top: 0,
      },
      grid: { left: '5%', right: '5%', bottom: '10%', top: '12%', containLabel: true },
      xAxis: {
        type: 'value',
        name: 'Velocidade do Vento (m/s)',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: { color: labelColor },
        splitLine: { lineStyle: { color: splitLineColor, type: 'dashed' } },
        axisLabel: { color: labelColor },
      },
      yAxis: {
        type: 'value',
        name: 'Altura do Solo (m)',
        nameTextStyle: { color: labelColor },
        splitLine: { lineStyle: { color: splitLineColor, type: 'dashed' } },
        axisLabel: { color: labelColor },
      },
      series: [
        {
          name: 'Perfil Ajustado (Power Law)',
          type: 'line',
          smooth: true,
          data: profileData,
          lineStyle: { color: '#06b6d4', width: 2.5 },
          showSymbol: false,
        },
        {
          name: 'Medições da Torre',
          type: 'scatter',
          data: measuredData,
          symbolSize: 12,
          itemStyle: { color: '#10b981', borderColor: '#ffffff', borderWidth: 1.5 },
        },
        {
          name: 'Extrapolação Hub Height',
          type: 'scatter',
          data: extrapData,
          symbolSize: 10,
          itemStyle: { color: '#f59e0b' },
        },
      ],
    };
  };

  const getTurbulenceOption = () => {
    if (!tiData) return {};
    const meanTi = tiData.speed_bins.map((b) => [b.speed_bin, b.mean_ti]);
    const charTi = tiData.speed_bins.map((b) => [b.speed_bin, b.characteristic_ti_90]);
    const iecA = tiData.speed_bins.map((b) => [b.speed_bin, b.iec_class_a]);
    const iecB = tiData.speed_bins.map((b) => [b.speed_bin, b.iec_class_b]);
    const iecC = tiData.speed_bins.map((b) => [b.speed_bin, b.iec_class_c]);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        textStyle: { color: tooltipText, fontSize: 12 },
      },
      legend: {
        data: [
          'TI Característica (P90)',
          'TI Média',
          'IEC 61400-1 Classe A',
          'IEC 61400-1 Classe B',
          'IEC 61400-1 Classe C',
        ],
        textStyle: { color: labelColor, fontSize: 11 },
        top: 0,
      },
      grid: { left: '5%', right: '5%', bottom: '10%', top: '16%', containLabel: true },
      xAxis: {
        type: 'value',
        name: 'Velocidade do Vento (m/s)',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: { color: labelColor },
        splitLine: { lineStyle: { color: splitLineColor, type: 'dashed' } },
        axisLabel: { color: labelColor },
      },
      yAxis: {
        type: 'value',
        name: 'Intensidade de Turbulência (TI)',
        nameTextStyle: { color: labelColor },
        splitLine: { lineStyle: { color: splitLineColor, type: 'dashed' } },
        axisLabel: { color: labelColor },
      },
      series: [
        {
          name: 'TI Característica (P90)',
          type: 'line',
          data: charTi,
          symbolSize: 8,
          lineStyle: { color: '#06b6d4', width: 2.5 },
          itemStyle: { color: '#06b6d4' },
        },
        {
          name: 'TI Média',
          type: 'line',
          data: meanTi,
          lineStyle: { color: labelColor, type: 'dashed' },
          itemStyle: { color: labelColor },
        },
        {
          name: 'IEC 61400-1 Classe A',
          type: 'line',
          data: iecA,
          showSymbol: false,
          lineStyle: { color: '#ef4444', width: 1.5 },
        },
        {
          name: 'IEC 61400-1 Classe B',
          type: 'line',
          data: iecB,
          showSymbol: false,
          lineStyle: { color: '#f97316', width: 1.5 },
        },
        {
          name: 'IEC 61400-1 Classe C',
          type: 'line',
          data: iecC,
          showSymbol: false,
          lineStyle: { color: '#22c55e', width: 1.5 },
        },
      ],
    };
  };

  const getMatrix12x24Option = () => {
    if (!matrixData) return {};
    const data: [number, number, number | null][] = [];
    matrixData.matrix.forEach((row, mIdx) => {
      row.forEach((val, hIdx) => {
        data.push([hIdx, mIdx, val]);
      });
    });

    return {
      backgroundColor: 'transparent',
      tooltip: {
        position: 'top',
        formatter: (p: any) =>
          `${matrixData.months[p.data[1]]} às ${matrixData.hours[p.data[0]]}<br/><b>${
            p.data[2] ?? '—'
          } m/s</b>`,
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        textStyle: { color: tooltipText, fontSize: 12 },
      },
      grid: { left: '5%', right: '6%', bottom: '12%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        data: matrixData.hours,
        splitArea: { show: true },
        axisLabel: { color: labelColor, interval: 1, fontSize: 11 },
        axisLine: { lineStyle: { color: axisLineColor } },
      },
      yAxis: {
        type: 'category',
        data: matrixData.months,
        splitArea: { show: true },
        axisLabel: { color: labelColor, fontSize: 11 },
        axisLine: { lineStyle: { color: axisLineColor } },
      },
      visualMap: {
        min: 4,
        max: 12,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '0%',
        inRange: {
          color: ['#0369a1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'],
        },
        textStyle: { color: labelColor },
      },
      series: [
        {
          name: 'Velocidade Média',
          type: 'heatmap',
          data,
          label: { show: false },
          emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } },
        },
      ],
    };
  };

  const getWeibullOption = () => {
    if (!weibullData) return {};
    const histFreqs = weibullData.histogram.map((h) => [h.speed, h.empirical_freq_pct]);
    const pdfCurve = weibullData.fitted_curve.map((c) => [c.speed, c.weibull_pdf_pct]);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        textStyle: { color: tooltipText, fontSize: 12 },
      },
      legend: {
        data: ['Frequência Medida', 'Ajuste de Weibull (PDF)'],
        textStyle: { color: labelColor },
        top: 0,
      },
      grid: { left: '5%', right: '5%', bottom: '10%', top: '12%', containLabel: true },
      xAxis: {
        type: 'value',
        name: 'Velocidade do Vento (m/s)',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: { color: labelColor },
        splitLine: { lineStyle: { color: splitLineColor, type: 'dashed' } },
        axisLabel: { color: labelColor },
      },
      yAxis: {
        type: 'value',
        name: 'Frequência (%)',
        nameTextStyle: { color: labelColor },
        splitLine: { lineStyle: { color: splitLineColor, type: 'dashed' } },
        axisLabel: { color: labelColor },
      },
      series: [
        {
          name: 'Frequência Medida',
          type: 'bar',
          barWidth: '90%',
          data: histFreqs,
          itemStyle: { color: 'rgba(6, 182, 212, 0.45)', borderColor: '#06b6d4' },
        },
        {
          name: 'Ajuste de Weibull (PDF)',
          type: 'line',
          smooth: true,
          data: pdfCurve,
          lineStyle: { color: '#f59e0b', width: 2.5 },
          showSymbol: false,
        },
      ],
    };
  };

  const cardClass = isLight
    ? 'bg-white border-slate-200 shadow-sm'
    : 'bg-zinc-900 border-zinc-800 shadow-sm';
  const selectClass = isLight
    ? 'bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg p-1.5 font-mono'
    : 'bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-lg p-1.5 font-mono';

  return (
    <div className="space-y-5">
      {/* Barra de Sub-abas & Controles */}
      <div className={`flex flex-wrap items-center justify-between gap-4 border p-2.5 rounded-2xl ${cardClass}`}>
        <div className="flex flex-wrap gap-1">
          {(
            [
              { id: 'rose', label: 'Rosa dos Ventos', Icon: Compass },
              { id: 'shear', label: 'Cisalhamento (Shear)', Icon: TrendingUp },
              { id: 'ti', label: 'Turbulência (TI & IEC)', Icon: Activity },
              { id: '12x24', label: 'Matriz 12x24', Icon: Calendar },
              { id: 'weibull', label: 'Ajuste Weibull', Icon: BarChart3 },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSubTab(id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                subTab === id
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Controles Globais */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 dark:text-zinc-400">Anemômetro:</span>
            <select
              value={selectedSpeedCol}
              onChange={(e) => setSelectedSpeedCol(e.target.value)}
              className={selectClass}
            >
              {speedCols.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} {c.height ? `(${c.height}m)` : ''}
                </option>
              ))}
            </select>
          </div>

          {subTab === 'rose' && (
            <>
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-500 dark:text-zinc-400">Palheta:</span>
                <select
                  value={selectedDirCol}
                  onChange={(e) => setSelectedDirCol(e.target.value)}
                  className={selectClass}
                >
                  {dirCols.length === 0 && <option value="">(Nenhuma)</option>}
                  {dirCols.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-500 dark:text-zinc-400">Setores:</span>
                <select
                  value={sectors}
                  onChange={(e) => setSectors(parseInt(e.target.value, 10))}
                  className={selectClass}
                >
                  <option value={12}>12 setores</option>
                  <option value={16}>16 setores</option>
                </select>
              </div>
            </>
          )}

          {subTab === 'ti' && (
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 dark:text-zinc-400">Desvio Padrão:</span>
              <select
                value={selectedStdCol}
                onChange={(e) => setSelectedStdCol(e.target.value)}
                className={selectClass}
              >
                {stdCols.length === 0 && <option value="">(Nenhum)</option>}
                {stdCols.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <label
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border cursor-pointer select-none ${
              applyQC
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : isLight
                ? 'bg-slate-50 border-slate-200 text-slate-600'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400'
            }`}
            title="Alternar uso dos dados filtrados pelo QC"
          >
            <input
              type="checkbox"
              checked={applyQC}
              onChange={(e) => setApplyQC(e.target.checked)}
              className="accent-emerald-500"
            />
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="font-semibold">Usar QC</span>
          </label>
        </div>
      </div>

      {error && (
        <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Sub-aba 1: Rosa dos Ventos */}
      {subTab === 'rose' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`lg:col-span-2 border rounded-2xl p-4 ${cardClass}`}>
            <h4 className={`text-sm font-bold mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Rosa dos Ventos Direcional & Faixas de Velocidade
            </h4>
            <div className="h-[460px]">
              {!selectedDirCol ? (
                <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                  Este dataset não possui canal de direção identificado.
                </div>
              ) : roseData ? (
                <ReactECharts
                  option={getWindRoseOption()}
                  style={{ height: '100%', width: '100%' }}
                  notMerge={true}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                  Calculando Rosa dos Ventos...
                </div>
              )}
            </div>
          </div>

          <div className={`border rounded-2xl p-4 overflow-hidden flex flex-col ${cardClass}`}>
            <h4 className={`text-sm font-bold mb-3 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Tabela Setorial de Vento
            </h4>
            <div className="overflow-y-auto flex-1 max-h-[450px]">
              <table className="w-full text-left text-xs">
                <thead
                  className={`sticky top-0 font-semibold border-b ${
                    isLight
                      ? 'bg-slate-50 text-slate-500 border-slate-200'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                  }`}
                >
                  <tr>
                    <th className="py-2 px-3">Setor</th>
                    <th className="py-2 px-3 text-right">Frequência</th>
                    <th className="py-2 px-3 text-right">Vel. Média</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-mono ${isLight ? 'divide-slate-100' : 'divide-zinc-800/60'}`}>
                  {roseData?.sector_data.map((s) => (
                    <tr key={s.sector_index} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-zinc-800/40'}>
                      <td className="py-2 px-3 font-semibold text-cyan-600 dark:text-cyan-400">{s.label}</td>
                      <td className="py-2 px-3 text-right">{s.frequency_pct}%</td>
                      <td className="py-2 px-3 text-right">{s.mean_speed} m/s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-aba 2: Cisalhamento Vertical */}
      {subTab === 'shear' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`lg:col-span-2 border rounded-2xl p-4 ${cardClass}`}>
            <h4 className={`text-sm font-bold mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Perfil de Cisalhamento Vertical (Wind Shear)
            </h4>
            <div className="h-[460px]">
              {shearData ? (
                <ReactECharts
                  option={getWindShearOption()}
                  style={{ height: '100%', width: '100%' }}
                  notMerge={true}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                  {error ? error : 'Calculando perfil vertical de cisalhamento...'}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className={`border rounded-2xl p-4 space-y-3 ${cardClass}`}>
              <h4
                className={`text-sm font-bold border-b pb-2 ${
                  isLight ? 'border-slate-200 text-slate-900' : 'border-zinc-800 text-white'
                }`}
              >
                Parâmetros de Perfil
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div
                  className={`border p-3 rounded-xl ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-800'
                  }`}
                >
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400 uppercase font-semibold">
                    Expoente Alfa (α)
                  </div>
                  <div className="text-xl font-bold font-mono text-cyan-600 dark:text-cyan-400 mt-1">
                    {shearData?.alpha ?? '—'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Power Law Fit</div>
                </div>
                <div
                  className={`border p-3 rounded-xl ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-800'
                  }`}
                >
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400 uppercase font-semibold">
                    Rugosidade (z₀)
                  </div>
                  <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    {shearData?.roughness_z0 !== null && shearData?.roughness_z0 !== undefined
                      ? `${shearData.roughness_z0} m`
                      : '—'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Log Law Fit</div>
                </div>
              </div>
            </div>

            <div className={`border rounded-2xl p-4 ${cardClass}`}>
              <h4 className={`text-sm font-bold mb-3 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Extrapolação para Hub Height
              </h4>
              <table className="w-full text-left text-xs font-mono">
                <thead
                  className={`font-semibold border-b ${
                    isLight
                      ? 'bg-slate-50 text-slate-500 border-slate-200'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                  }`}
                >
                  <tr>
                    <th className="py-2 px-3">Altura</th>
                    <th className="py-2 px-3 text-right">Vel. Extrapolada</th>
                    <th className="py-2 px-3 text-right">Ganho</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-zinc-800/60'}`}>
                  {shearData?.extrapolated_hub_heights.map((e) => (
                    <tr key={e.hub_height} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-zinc-800/40'}>
                      <td className="py-2 px-3 font-semibold">{e.hub_height} m</td>
                      <td className="py-2 px-3 text-right text-cyan-600 dark:text-cyan-400 font-bold">
                        {e.power_law_speed} m/s
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400">
                        +{e.speed_increase_pct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-aba 3: Turbulência IEC */}
      {subTab === 'ti' && (
        <div className={`border rounded-2xl p-4 ${cardClass}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h4 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Intensidade de Turbulência (TI) vs Velocidade — IEC 61400-1
            </h4>
            {tiData?.char_ti_at_15ms !== null && tiData?.char_ti_at_15ms !== undefined && (
              <div
                className={`text-xs border px-3 py-1 rounded-lg ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-800'
                }`}
              >
                <span className="text-slate-500 dark:text-zinc-400">TI Característica a 15 m/s:</span>{' '}
                <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                  {(tiData.char_ti_at_15ms * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          <div className="h-[460px]">
            {!selectedStdCol ? (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                Este dataset não possui canal de desvio padrão (Std) para cálculo de turbulência.
              </div>
            ) : tiData ? (
              <ReactECharts
                option={getTurbulenceOption()}
                style={{ height: '100%', width: '100%' }}
                notMerge={true}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                Calculando curvas de turbulência IEC 61400-1...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-aba 4: Matriz 12x24 */}
      {subTab === '12x24' && (
        <div className={`border rounded-2xl p-4 ${cardClass}`}>
          <h4 className={`text-sm font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Matriz Diurna-Sazonal (12 Meses x 24 Horas)
          </h4>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mb-3">
            Velocidade média do vento agrupada por hora do dia e mês do ano (m/s)
          </p>
          <div className="h-[460px]">
            {matrixData ? (
              <ReactECharts
                option={getMatrix12x24Option()}
                style={{ height: '100%', width: '100%' }}
                notMerge={true}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                Gerando mapa de calor 12x24...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-aba 5: Weibull */}
      {subTab === 'weibull' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`lg:col-span-2 border rounded-2xl p-4 ${cardClass}`}>
            <h4 className={`text-sm font-bold mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Histograma de Frequências & Distribuição de Weibull
            </h4>
            <div className="h-[460px]">
              {weibullData ? (
                <ReactECharts
                  option={getWeibullOption()}
                  style={{ height: '100%', width: '100%' }}
                  notMerge={true}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                  Ajustando parâmetros de Weibull...
                </div>
              )}
            </div>
          </div>

          <div className={`border rounded-2xl p-4 space-y-4 ${cardClass}`}>
            <h4
              className={`text-sm font-bold border-b pb-2 ${
                isLight ? 'border-slate-200 text-slate-900' : 'border-zinc-800 text-white'
              }`}
            >
              Parâmetros Estimados (MLE)
            </h4>
            <div className="space-y-3 font-mono">
              <div
                className={`border p-3 rounded-xl ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-800'
                }`}
              >
                <div className="text-[11px] text-slate-500 dark:text-zinc-400 uppercase font-semibold">
                  Fator de Forma (k)
                </div>
                <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 mt-1">
                  {weibullData?.k_shape ?? '—'}
                </div>
                <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                  Assimetria e concentração da distribuição
                </div>
              </div>

              <div
                className={`border p-3 rounded-xl ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-800'
                }`}
              >
                <div className="text-[11px] text-slate-500 dark:text-zinc-400 uppercase font-semibold">
                  Fator de Escala (c)
                </div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {weibullData?.c_scale ?? '—'} m/s
                </div>
                <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                  Escala característica de intensidade eólica
                </div>
              </div>

              <div
                className={`border p-3 rounded-xl ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-zinc-800'
                }`}
              >
                <div className="text-[11px] text-slate-500 dark:text-zinc-400 uppercase font-semibold">
                  Velocidade Média
                </div>
                <div className="text-2xl font-bold text-amber-500 mt-1">
                  {weibullData?.mean_speed ?? '—'} m/s
                </div>
                <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                  Média aritmética do período selecionado
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
