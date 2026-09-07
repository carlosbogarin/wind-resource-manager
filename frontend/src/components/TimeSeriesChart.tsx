import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { TimeSeriesItem } from '../types';

interface TimeSeriesChartProps {
  data: TimeSeriesItem[];
  nodeTitle: string;
  model: string;
  aggregation: 'daily' | 'monthly' | 'hourly';
  onChangeAggregation: (agg: 'daily' | 'monthly' | 'hourly') => void;
  isLoading?: boolean;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  nodeTitle,
  model,
  aggregation,
  onChangeAggregation,
  isLoading,
}) => {
  const option = useMemo(() => {
    const times = data.map((d) => d.time);
    const speeds100 = data.map((d) => d.speed_100m);
    const speeds10 = data.map((d) => d.speed_10m);
    const speedsMax = data.map((d) => d.speed_max ?? null);
    const speedsMeasured = data.map((d) => d.speed_measured ?? null);

    const hasMeasured = data.some((d) => d.speed_measured !== null && d.speed_measured !== undefined);
    const isCyan = model === 'ERA5';
    const primaryColor = isCyan ? '#06b6d4' : '#f59e0b';
    const measuredColor = '#10b981'; // Emerald para anemômetros reais
    const secondaryColor = '#818cf8'; // Índigo para vento 10m

    const legendItems = ['Vento a 100m (Hub)'];
    if (hasMeasured) legendItems.push('Vento Medido Usina (ONS)');
    legendItems.push('Vento a 10m (Superfície)');
    if (aggregation === 'daily') legendItems.push('Rajada Máxima Diária');

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#18181b',
        borderColor: '#27272a',
        textStyle: { color: '#f4f4f5', fontSize: 12 },
        axisPointer: {
          type: 'cross',
          lineStyle: { color: '#52525b', type: 'dashed' },
        },
      },
      legend: {
        data: legendItems,
        textStyle: { color: '#a1a1aa', fontSize: 11 },
        top: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '12%',
        containLabel: true,
      },
      toolbox: {
        feature: {
          dataZoom: { yAxisIndex: 'none' },
          restore: {},
          saveAsImage: { name: `WindSeries_${nodeTitle}` },
        },
        iconStyle: { borderColor: '#a1a1aa' },
        right: 15,
      },
      dataZoom: [
        {
          type: 'inside',
          start: 70,
          end: 100,
        },
        {
          type: 'slider',
          start: 70,
          end: 100,
          borderColor: '#27272a',
          fillerColor: isCyan ? 'rgba(6, 182, 212, 0.15)' : 'rgba(245, 158, 11, 0.15)',
          handleStyle: { color: primaryColor },
          textStyle: { color: '#a1a1aa', fontSize: 10 },
          bottom: 0,
          height: 25,
        },
      ],
      xAxis: {
        type: 'category',
        data: times,
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#3f3f46' } },
        axisLabel: { color: '#a1a1aa', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        name: 'Velocidade do Vento (m/s)',
        nameTextStyle: { color: '#a1a1aa', fontSize: 11 },
        axisLine: { lineStyle: { color: '#3f3f46' } },
        axisLabel: { color: '#a1a1aa', fontSize: 11 },
        splitLine: { lineStyle: { color: '#27272a', type: 'dashed' } },
      },
      series: [
        {
          name: 'Vento a 100m (Hub)',
          type: 'line',
          data: speeds100,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2, color: primaryColor },
          itemStyle: { color: primaryColor },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: isCyan ? 'rgba(6, 182, 212, 0.35)' : 'rgba(245, 158, 11, 0.35)' },
                { offset: 1, color: isCyan ? 'rgba(6, 182, 212, 0.0)' : 'rgba(245, 158, 11, 0.0)' },
              ],
            },
          },
        },
        ...(hasMeasured
          ? [
              {
                name: 'Vento Medido Usina (ONS)',
                type: 'line',
                data: speedsMeasured,
                smooth: true,
                showSymbol: false,
                lineStyle: { width: 2, color: measuredColor },
                itemStyle: { color: measuredColor },
              },
            ]
          : []),
        {
          name: 'Vento a 10m (Superfície)',
          type: 'line',
          data: speeds10,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1.5, color: secondaryColor },
          itemStyle: { color: secondaryColor },
        },
        ...(aggregation === 'daily'
          ? [
              {
                name: 'Rajada Máxima Diária',
                type: 'line',
                data: speedsMax,
                smooth: true,
                showSymbol: false,
                lineStyle: { width: 1, type: 'dashed', color: '#f87171' },
                itemStyle: { color: '#f87171' },
              },
            ]
          : []),
      ],
    };
  }, [data, nodeTitle, model, aggregation]);

  const hasMeasuredData = useMemo(
    () => data.some((d) => d.speed_measured !== null && d.speed_measured !== undefined),
    [data]
  );

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div>
          <h4 className="text-base font-bold text-white flex flex-wrap items-center gap-2">
            <span>Série Histórica Reanálise: {nodeTitle}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
              {model}
            </span>
            {hasMeasuredData && (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Vento Anemômetro ONS Concomitante
              </span>
            )}
          </h4>
          <p className="text-xs text-zinc-400 mt-0.5">
            Velocidade média horária/diária do vento a 100m (altura do rotor), 10m e medição real dos aerogeradores (ONS)
          </p>
        </div>

        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
          {(['daily', 'monthly', 'hourly'] as const).map((agg) => (
            <button
              key={agg}
              type="button"
              onClick={() => onChangeAggregation(agg)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                aggregation === agg
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {agg === 'daily' ? 'Diária' : agg === 'monthly' ? 'Mensal' : 'Horária'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-[380px] flex items-center justify-center text-xs text-zinc-500">
          Carregando série temporal de reanálise...
        </div>
      ) : data.length === 0 ? (
        <div className="h-[380px] flex flex-col items-center justify-center text-xs text-zinc-500 space-y-2">
          <p>Nenhuma série carregada para este nó.</p>
          <p className="text-zinc-600">Clique em "Baixar Série" para processar dados de 30 anos.</p>
        </div>
      ) : (
        <div className="w-full h-[380px]">
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
        </div>
      )}
    </div>
  );
};