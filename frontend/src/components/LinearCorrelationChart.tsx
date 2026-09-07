import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { CorrelationResponse } from '../types';

interface LinearCorrelationChartProps {
  data: CorrelationResponse | null;
  nodeTitle: string;
  model: string;
  ensembleName: string;
  aggregation: 'hourly' | 'daily';
  onChangeAggregation: (agg: 'hourly' | 'daily') => void;
  isLoading?: boolean;
}

export const LinearCorrelationChart: React.FC<LinearCorrelationChartProps> = ({
  data,
  nodeTitle,
  model,
  ensembleName,
  aggregation,
  onChangeAggregation,
  isLoading,
}) => {
  const chartOption = useMemo(() => {
    if (!data || !data.scatter_points || data.scatter_points.length === 0) {
      return null;
    }

    const isCyan = model === 'ERA5';
    const fitLineColor = isCyan ? '#06b6d4' : '#f59e0b';

    // Formatar pontos de dispersão [x, y, time]
    const scatterData = data.scatter_points.map((p) => [p.x, p.y, p.time]);

    // Reta de regressão ajustada
    const fitLineData = data.fit_line.map((p) => [p.x, p.y]);

    // Reta 1:1 ideal
    const idealLineData = data.ideal_line.map((p) => [p.x, p.y]);

    // Encontrar máximos para enquadramento equilibrado
    const maxVal = Math.max(
      ...data.fit_line.map((p) => Math.max(p.x, p.y)),
      ...data.ideal_line.map((p) => p.x),
      15
    );

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#18181b',
        borderColor: '#27272a',
        textStyle: { color: '#f4f4f5', fontSize: 12 },
        formatter: (params: any) => {
          if (params.seriesName === 'Amostras Concomitantes') {
            const [x, y, time] = params.data;
            return `
              <div class="font-sans text-xs space-y-1">
                <div class="text-zinc-400 font-mono">${time}</div>
                <div class="text-white">Reanálise (${model}): <span class="font-bold text-cyan-400">${x.toFixed(2)} m/s</span></div>
                <div class="text-white">Medido Usina (ONS): <span class="font-bold text-emerald-400">${y.toFixed(2)} m/s</span></div>
                <div class="text-zinc-400 text-[10px]">Δ (Erro): ${(y - x).toFixed(2)} m/s</div>
              </div>
            `;
          }
          if (params.seriesName === 'Reta de Regressão') {
            return `<span class="text-xs text-zinc-300 font-sans">Ajuste Linear: <b>${data.equation}</b></span>`;
          }
          if (params.seriesName === 'Linha 1:1 (Ideal)') {
            return `<span class="text-xs text-zinc-300 font-sans">Reta 1:1 de Referência (y = x)</span>`;
          }
          return '';
        },
      },
      legend: {
        data: ['Amostras Concomitantes', 'Reta de Regressão', 'Linha 1:1 (Ideal)'],
        textStyle: { color: '#a1a1aa', fontSize: 11 },
        top: 0,
      },
      grid: {
        left: '4%',
        right: '4%',
        bottom: '10%',
        top: '12%',
        containLabel: true,
      },
      toolbox: {
        feature: {
          dataZoom: {},
          restore: {},
          saveAsImage: { name: `MCP_Correlation_${ensembleName}_${nodeTitle}` },
        },
        iconStyle: { borderColor: '#a1a1aa' },
        right: 15,
      },
      xAxis: {
        type: 'value',
        name: `Reanálise ${model} (m/s)`,
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: { color: '#a1a1aa', fontSize: 11 },
        min: 0,
        max: Math.ceil(maxVal),
        axisLine: { lineStyle: { color: '#3f3f46' } },
        axisLabel: { color: '#a1a1aa', fontSize: 11 },
        splitLine: { lineStyle: { color: '#27272a', type: 'dashed' } },
      },
      yAxis: {
        type: 'value',
        name: 'Vento Medido Usina - ONS (m/s)',
        nameTextStyle: { color: '#a1a1aa', fontSize: 11 },
        min: 0,
        max: Math.ceil(maxVal),
        axisLine: { lineStyle: { color: '#3f3f46' } },
        axisLabel: { color: '#a1a1aa', fontSize: 11 },
        splitLine: { lineStyle: { color: '#27272a', type: 'dashed' } },
      },
      series: [
        {
          name: 'Amostras Concomitantes',
          type: 'scatter',
          symbolSize: 4.5,
          data: scatterData,
          itemStyle: {
            color: 'rgba(56, 189, 248, 0.45)', // Sky blue translúcido
            borderColor: 'rgba(56, 189, 248, 0.7)',
            borderWidth: 0.5,
          },
        },
        {
          name: 'Reta de Regressão',
          type: 'line',
          data: fitLineData,
          smooth: false,
          showSymbol: false,
          lineStyle: {
            width: 2.5,
            color: fitLineColor,
          },
          z: 5,
        },
        {
          name: 'Linha 1:1 (Ideal)',
          type: 'line',
          data: idealLineData,
          smooth: false,
          showSymbol: false,
          lineStyle: {
            width: 1.5,
            type: 'dashed',
            color: '#71717a',
          },
          z: 4,
        },
      ],
    };
  }, [data, model, ensembleName, nodeTitle]);

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <span>Correlação Linear MCP: Reanálise vs Dados Medidos ONS</span>
            </h4>
            <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
              {model} ({nodeTitle})
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-emerald-400 font-medium">
              {ensembleName}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Metodologia Measure-Correlate-Predict (MCP): calibragem entre velocidades de vento da reanálise atmosférica e medições reais dos anemômetros dos aerogeradores (ONS EOL Detailed).
          </p>
        </div>

        {/* Seletor de Resolução Horária / Diária */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
          <button
            type="button"
            onClick={() => onChangeAggregation('hourly')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              aggregation === 'hourly'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Horária
          </button>
          <button
            type="button"
            onClick={() => onChangeAggregation('daily')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              aggregation === 'daily'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Diária (Média)
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-[420px] flex items-center justify-center text-xs text-zinc-500">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span>Processando correlação linear concomitante...</span>
          </div>
        </div>
      ) : !data ? (
        <div className="h-[420px] flex flex-col items-center justify-center text-xs text-zinc-500 space-y-2">
          <p className="text-zinc-400 font-medium">Dados concomitantes insuficientes para calcular correlação.</p>
          <p className="text-zinc-600 max-w-md text-center">
            Certifique-se de que a série de reanálise deste nó está baixada e que o conjunto eólico possui registros de anemômetro válidos no dataset do ONS.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Grade de Métricas MCP */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Pearson R */}
            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-zinc-400">Pearson (R)</span>
              <div className="mt-1">
                <span className={`text-xl font-bold font-mono ${data.r_color}`}>
                  {data.pearson_r.toFixed(4)}
                </span>
                <span className={`block text-[10px] font-medium mt-0.5 ${data.r_color}`}>
                  {data.r_quality}
                </span>
              </div>
            </div>

            {/* R² */}
            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-zinc-400">Determinação (R²)</span>
              <div className="mt-1">
                <span className="text-xl font-bold font-mono text-white">
                  {(data.r_squared * 100).toFixed(2)}%
                </span>
                <span className="block text-[10px] text-zinc-500 mt-0.5">
                  Variância explicada
                </span>
              </div>
            </div>

            {/* Equação Linear */}
            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3 flex flex-col justify-between sm:col-span-2 lg:col-span-2">
              <span className="text-[11px] font-medium text-zinc-400">Equação do Modelo MCP</span>
              <div className="mt-1">
                <span className="text-sm font-bold font-mono text-cyan-400 block truncate">
                  {data.equation}
                </span>
                <span className="text-[10px] text-zinc-500 mt-0.5 block">
                  Inclinação: a = {data.slope.toFixed(3)} | Intercepto: b = {data.intercept.toFixed(3)}
                </span>
              </div>
            </div>

            {/* Bias */}
            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-zinc-400">Bias (Viés Médio)</span>
              <div className="mt-1">
                <span className={`text-xl font-bold font-mono ${data.bias > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {data.bias > 0 ? `+${data.bias.toFixed(2)}` : data.bias.toFixed(2)} m/s
                </span>
                <span className="block text-[10px] text-zinc-500 mt-0.5">
                  Vmed - Vrean
                </span>
              </div>
            </div>

            {/* RMSE & MAE */}
            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-zinc-400">Incerteza (RMSE / MAE)</span>
              <div className="mt-1">
                <span className="text-xl font-bold font-mono text-zinc-200">
                  {data.rmse.toFixed(2)} <span className="text-xs text-zinc-500 font-sans">m/s</span>
                </span>
                <span className="block text-[10px] text-zinc-500 mt-0.5">
                  MAE: {data.mae.toFixed(2)} m/s ({data.n_samples.toLocaleString('pt-BR')} pts)
                </span>
              </div>
            </div>
          </div>

          {/* Gráfico de Dispersão */}
          {chartOption && (
            <div className="w-full h-[450px]">
              <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} />
            </div>
          )}

          {/* Rodapé Comparativo */}
          <div className="bg-zinc-950/50 border border-zinc-800/60 rounded-xl p-3 flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-400">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-zinc-500">Média Reanálise:</span>{' '}
                <span className="font-mono text-cyan-400 font-bold">{data.reanalysis_mean.toFixed(2)} m/s</span>{' '}
                <span className="text-[10px] text-zinc-600">(σ = {data.reanalysis_std.toFixed(2)})</span>
              </div>
              <div className="border-l border-zinc-800 pl-4">
                <span className="text-zinc-500">Média Medida (ONS):</span>{' '}
                <span className="font-mono text-emerald-400 font-bold">{data.measured_mean.toFixed(2)} m/s</span>{' '}
                <span className="text-[10px] text-zinc-600">(σ = {data.measured_std.toFixed(2)})</span>
              </div>
            </div>
            <div className="text-[11px] text-zinc-500">
              {aggregation === 'hourly'
                ? 'Agrupamento horário concomitante'
                : 'Agrupamento diário concomitante (reduz ruído de micro-escala)'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
