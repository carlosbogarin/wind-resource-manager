import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { ONSCorrelationItem } from '../types';

interface CapacityFactorComparisonProps {
  data: ONSCorrelationItem[];
  ensembleName: string;
}

export const CapacityFactorComparison: React.FC<CapacityFactorComparisonProps> = ({
  data,
  ensembleName,
}) => {
  const option = useMemo(() => {
    const dates = data.map((d) => d.mes_ano);
    const fc = data.map((d) => d.ons_fc_pct);
    const wind = data.map((d) => d.reanalysis_wind_speed ?? null);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#18181b',
        borderColor: '#27272a',
        textStyle: { color: '#f4f4f5', fontSize: 11 },
      },
      legend: {
        data: ['Fator de Capacidade Real ONS (%)', 'Velocidade Média do Vento Reanálise (m/s)'],
        textStyle: { color: '#a1a1aa', fontSize: 11 },
        top: 0,
      },
      grid: {
        left: '4%',
        right: '4%',
        bottom: '12%',
        top: '14%',
        containLabel: true,
      },
      dataZoom: [
        {
          type: 'inside',
          start: 50,
          end: 100,
        },
        {
          type: 'slider',
          start: 50,
          end: 100,
          borderColor: '#27272a',
          fillerColor: 'rgba(16, 185, 129, 0.15)',
          handleStyle: { color: '#10b981' },
          textStyle: { color: '#a1a1aa', fontSize: 10 },
          bottom: 0,
          height: 20,
        },
      ],
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: '#3f3f46' } },
        axisLabel: { color: '#a1a1aa', fontSize: 10 },
      },
      yAxis: [
        {
          type: 'value',
          name: 'FC Real ONS (%)',
          nameTextStyle: { color: '#10b981', fontSize: 11 },
          axisLine: { lineStyle: { color: '#10b981' } },
          axisLabel: { color: '#10b981', fontSize: 10, formatter: '{value}%' },
          splitLine: { lineStyle: { color: '#27272a', type: 'dashed' } },
          max: 100,
        },
        {
          type: 'value',
          name: 'Vento Reanálise (m/s)',
          nameTextStyle: { color: '#06b6d4', fontSize: 11 },
          axisLine: { lineStyle: { color: '#06b6d4' } },
          axisLabel: { color: '#06b6d4', fontSize: 10 },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'Fator de Capacidade Real ONS (%)',
          type: 'bar',
          data: fc,
          yAxisIndex: 0,
          itemStyle: {
            color: 'rgba(16, 185, 129, 0.7)',
            borderRadius: [3, 3, 0, 0],
          },
        },
        {
          name: 'Velocidade Média do Vento Reanálise (m/s)',
          type: 'line',
          data: wind,
          yAxisIndex: 1,
          smooth: true,
          showSymbol: true,
          symbolSize: 5,
          lineStyle: { width: 2.5, color: '#06b6d4' },
          itemStyle: { color: '#06b6d4' },
        },
      ],
    };
  }, [data]);

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-3">
      <div className="border-b border-zinc-800 pb-2 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-white">Correlação: FC Real ONS vs Reanálise</h4>
          <p className="text-xs text-zinc-400">
            Validação do recurso eólico com o desempenho histórico do conjunto {ensembleName}
          </p>
        </div>
      </div>
      <div className="w-full h-[320px]">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-zinc-500">
            Carregue a série de reanálise para visualizar a correlação com os dados mensais do ONS.
          </div>
        ) : (
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
        )}
      </div>
    </div>
  );
};