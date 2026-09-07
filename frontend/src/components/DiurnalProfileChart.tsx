import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { DiurnalProfileItem } from '../types';

interface DiurnalProfileChartProps {
  data: DiurnalProfileItem[];
  model: string;
}

export const DiurnalProfileChart: React.FC<DiurnalProfileChartProps> = ({ data, model }) => {
  const option = useMemo(() => {
    const hours = data.map((d) => d.hour_label);
    const mean = data.map((d) => d.mean_speed);
    const p10 = data.map((d) => d.p10_speed);
    const p90 = data.map((d) => d.p90_speed);

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
        data: ['Velocidade Média', 'P90 (90%)', 'P10 (10%)'],
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
        data: hours,
        boundaryGap: false,
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
          name: 'P90 (90%)',
          type: 'line',
          data: p90,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1, type: 'dashed', color: '#a1a1aa' },
        },
        {
          name: 'Velocidade Média',
          type: 'line',
          data: mean,
          smooth: true,
          showSymbol: true,
          symbolSize: 5,
          lineStyle: { width: 2.5, color: primaryColor },
          itemStyle: { color: primaryColor },
        },
        {
          name: 'P10 (10%)',
          type: 'line',
          data: p10,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 1, type: 'dashed', color: '#71717a' },
        },
      ],
    };
  }, [data, model]);

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-2">
      <div className="border-b border-zinc-800 pb-2">
        <h4 className="text-sm font-bold text-white">Perfil Diurno Médio (00h - 23h)</h4>
        <p className="text-xs text-zinc-400">Ciclo térmico e comportamento horário do vento</p>
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