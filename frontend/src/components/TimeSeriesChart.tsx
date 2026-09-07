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

    const isCyan = model === 'ERA5';
    const primaryColor = isCyan ? '#06b6d4' : '#f59e0b';
    const secondaryColor = '#10b981';

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
        data: ['Vento a 100m (Hub)', 'Vento a 10m (Superfície)', 'Rajada Máxima Diária'],
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

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div>
          <h4 className="text-base font-bold text-white flex items-center gap-2">
            <span>Série Histórica Reanálise: {nodeTitle}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
              {model}
            </span>
          </h4>
          <p className="text-xs text-zinc-400 mt-0.5">
            Velocidade média horária/diária do vento a 100m (altura do rotor) e 10m com zoom interativo
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