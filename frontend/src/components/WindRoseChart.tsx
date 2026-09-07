import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { WindRoseData } from '../types';

interface WindRoseChartProps {
  data: WindRoseData;
}

export const WindRoseChart: React.FC<WindRoseChartProps> = ({ data }) => {
  const option = useMemo(() => {
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#18181b',
        borderColor: '#27272a',
        textStyle: { color: '#f4f4f5', fontSize: 11 },
        formatter: (params: any) => {
          return `<div class="font-sans">
            <div class="font-bold text-xs text-white">${params.name} (${params.seriesName})</div>
            <div class="text-xs text-zinc-400 mt-1">Frequência: <strong class="text-cyan-400">${params.value.toFixed(2)}%</strong></div>
          </div>`;
        },
      },
      legend: {
        data: data.speed_bins,
        textStyle: { color: '#a1a1aa', fontSize: 10 },
        bottom: 0,
        itemWidth: 10,
        itemHeight: 10,
      },
      polar: {
        radius: ['15%', '70%'],
      },
      angleAxis: {
        type: 'category',
        data: data.sectors,
        boundaryGap: false,
        splitLine: { show: true, lineStyle: { color: '#27272a' } },
        axisLine: { lineStyle: { color: '#3f3f46' } },
        axisLabel: { color: '#d4d4d8', fontSize: 10, fontWeight: 'bold' },
        startAngle: 90, // North at top
        clockwise: true,
      },
      radiusAxis: {
        min: 0,
        splitLine: { lineStyle: { color: '#27272a', type: 'dashed' } },
        axisLabel: { color: '#71717a', fontSize: 9, formatter: '{value}%' },
      },
      series: data.series.map((s) => ({
        type: 'bar',
        data: s.data,
        coordinateSystem: 'polar',
        name: s.name,
        stack: 'wind',
        itemStyle: { color: s.color },
      })),
    };
  }, [data]);

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-3">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
        <div>
          <h4 className="text-sm font-bold text-white">Rosa dos Ventos (16 Setores)</h4>
          <p className="text-xs text-zinc-400">Distribuição direcional das frequências de vento</p>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-zinc-400">Setor Dominante:</span>
          <p className="text-xs font-bold text-cyan-400">{data.dominant_sector} ({data.dominant_frequency_pct}%)</p>
        </div>
      </div>
      <div className="w-full h-[320px]">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
};