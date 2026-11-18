import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { WeibullData } from '../types';

interface WeibullChartProps {
  data: WeibullData;
}

export const WeibullChart: React.FC<WeibullChartProps> = ({ data }) => {
  const option = useMemo(() => {
    const curvePoints = data.weibull_curve.map((c) => [c.speed, c.probability_pct]);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#18181b',
        borderColor: '#27272a',
        textStyle: { color: '#f4f4f5', fontSize: 11 },
      },
      legend: {
        data: ['Frequência Observada (Histograma)', 'Curva de Weibull Ajustada'],
        textStyle: { color: '#a1a1aa', fontSize: 11 },
        top: 0,
      },
      grid: {
        left: '4%',
        right: '4%',
        bottom: '10%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: 'Velocidade (m/s)',
        nameLocation: 'middle',
        nameGap: 25,
        nameTextStyle: { color: '#a1a1aa', fontSize: 10 },
        axisLine: { lineStyle: { color: '#3f3f46' } },
        axisLabel: { color: '#a1a1aa', fontSize: 10 },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        name: 'Probabilidade (%)',
        nameTextStyle: { color: '#a1a1aa', fontSize: 10 },
        axisLine: { lineStyle: { color: '#3f3f46' } },
        axisLabel: { color: '#a1a1aa', fontSize: 10 },
        splitLine: { lineStyle: { color: '#27272a', type: 'dashed' } },
      },
      series: [
        {
          name: 'Frequência Observada (Histograma)',
          type: 'bar',
          data: data.histogram.map((h) => [h.speed_center, h.frequency_pct]),
          barWidth: '75%',
          itemStyle: {
            color: 'rgba(6, 182, 212, 0.45)',
            borderColor: '#06b6d4',
            borderWidth: 1,
            borderRadius: [2, 2, 0, 0],
          },
        },
        {
          name: 'Curva de Weibull Ajustada',
          type: 'line',
          data: curvePoints,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2.5, color: '#f59e0b' },
          itemStyle: { color: '#f59e0b' },
        },
      ],
    };
  }, [data]);

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2">
        <div>
          <h4 className="text-sm font-bold text-white">Distribuição Probabilística de Weibull</h4>
          <p className="text-xs text-zinc-400">Ajuste de máxima verossimilhança sobre a série histórica</p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2 py-1 rounded bg-zinc-800 text-amber-400 border border-amber-500/30">
            k (forma) = <strong>{data.k_shape}</strong>
          </span>
          <span className="px-2 py-1 rounded bg-zinc-800 text-cyan-400 border border-cyan-500/30">
            c (escala) = <strong>{data.c_scale} m/s</strong>
          </span>
          <span className="px-2 py-1 rounded bg-zinc-800 text-emerald-400 border border-emerald-500/30">
            Vmed = <strong>{data.mean_speed} m/s</strong>
          </span>
        </div>
      </div>
      <div className="w-full h-[320px]">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
};