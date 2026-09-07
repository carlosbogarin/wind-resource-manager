import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { MonthlySeasonalityItem } from '../types';

interface SeasonalityChartProps {
  data: MonthlySeasonalityItem[];
  model: string;
}

export const SeasonalityChart: React.FC<SeasonalityChartProps> = ({ data, model }) => {
  const option = useMemo(() => {
    const months = data.map((d) => d.month_name);
    const mean = data.map((d) => d.mean_speed);
    const min = data.map((d) => d.min_speed);
    const max = data.map((d) => d.max_speed);

    const isCyan = model === 'ERA5';
    const primaryColor = isCyan ? '#06b6d4' : '#f59e0b';

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#18181b',
        borderColor: '#27272a',
        textStyle: { color: '#f4f4f5', fontSize: 12 },
      },
      legend: {
        data: ['Velocidade Média Mensal', 'Máxima Observada', 'Mínima Observada'],
        textStyle: { color: '#a1a1aa', fontSize: 11 },
        top: 0,
      },
      grid: {
        left: '4%',
        right: '4%',
        bottom: '8%',
        top: '14%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: months,
        axisLine: { lineStyle: { color: '#3f3f46' } },
        axisLabel: { color: '#a1a1aa', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        name: 'm/s',
        nameTextStyle: { color: '#a1a1aa', fontSize: 11 },
        axisLine: { lineStyle: { color: '#3f3f46' } },
        axisLabel: { color: '#a1a1aa', fontSize: 10 },
        splitLine: { lineStyle: { color: '#27272a', type: 'dashed' } },
      },
      series: [
        {
          name: 'Velocidade Média Mensal',
          type: 'bar',
          data: mean,
          itemStyle: {
            color: primaryColor,
            borderRadius: [4, 4, 0, 0],
          },
        },
        {
          name: 'Máxima Observada',
          type: 'line',
          data: max,
          smooth: true,
          showSymbol: true,
          symbolSize: 4,
          lineStyle: { width: 1.5, type: 'dashed', color: '#f87171' },
          itemStyle: { color: '#f87171' },
        },
        {
          name: 'Mínima Observada',
          type: 'line',
          data: min,
          smooth: true,
          showSymbol: true,
          symbolSize: 4,
          lineStyle: { width: 1.5, type: 'dashed', color: '#38bdf8' },
          itemStyle: { color: '#38bdf8' },
        },
      ],
    };
  }, [data, model]);

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-2">
      <div className="border-b border-zinc-800 pb-2">
        <h4 className="text-sm font-bold text-white">Sazonalidade Mensal (Jan - Dez)</h4>
        <p className="text-xs text-zinc-400">Padrão anual dos ventos alísios e regimes de safra</p>
      </div>
      <div className="w-full h-[260px]">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-zinc-500">Sem dados</div>
        ) : (
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
        )}
      </div>
    </div>
  );
};