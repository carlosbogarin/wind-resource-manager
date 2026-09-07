import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { TimeSeriesItem } from '../types';

interface TimeSeriesChartProps {
  data: TimeSeriesItem[];
  nodeTitle: string;
  model: string;
  aggregation: 'daily' | 'monthly' | 'hourly';
  onChangeAggregation: (agg: 'daily' | 'monthly' | 'hourly') => void;
  availablePlants?: string[];
  selectedPlant?: string;
  onSelectPlant?: (plant: string) => void;
  isLoading?: boolean;
}

const PLANT_COLORS = [
  '#34d399', // emerald-400
  '#38bdf8', // sky-400
  '#fbbf24', // amber-400
  '#c084fc', // purple-400
  '#fb7185', // rose-400
  '#2dd4bf', // teal-400
  '#a3e635', // lime-400
];

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  nodeTitle,
  model,
  aggregation,
  onChangeAggregation,
  availablePlants,
  selectedPlant = 'Média do Conjunto',
  onSelectPlant,
  isLoading,
}) => {
  const plantNames = useMemo(() => {
    const set = new Set<string>();
    for (const d of data) {
      if (d.plant_speeds) {
        for (const p of Object.keys(d.plant_speeds)) {
          if (p && p !== 'Média do Conjunto') set.add(p);
        }
      }
    }
    return Array.from(set).sort();
  }, [data]);

  const hasMeasured = useMemo(
    () => data.some((d) => d.speed_measured !== null && d.speed_measured !== undefined),
    [data]
  );

  const hasInvalid = useMemo(
    () => data.some((d) => (d.invalid_wind_pct ?? 0) > 0),
    [data]
  );

  const mainMeasuredLabel = useMemo(() => {
    return selectedPlant && selectedPlant !== 'Média do Conjunto'
      ? `Vento Medido (${selectedPlant})`
      : 'Vento Medido (Média Conjunto)';
  }, [selectedPlant]);

  const legendItems = useMemo(() => {
    const items = ['Vento a 100m (Hub)'];
    if (hasMeasured) items.push(mainMeasuredLabel);
    plantNames.forEach((p) => {
      items.push(`Usina: ${p}`);
    });
    items.push('Vento a 10m (Superfície)');
    if (aggregation === 'daily') items.push('Rajada Máxima Diária');
    if (hasInvalid) items.push('Flag Vento Inválido (%)');
    return items;
  }, [hasMeasured, mainMeasuredLabel, plantNames, aggregation, hasInvalid]);

  // Altura dinâmica variável dependendo da quantidade de itens de legenda
  // Cada linha de legenda comporta ~3 itens em telas comuns.
  const estimatedLegendRows = Math.max(1, Math.ceil(legendItems.length / 3));
  const gridTop = 46 + (estimatedLegendRows - 1) * 28;
  const dynamicChartHeight = 380 + (estimatedLegendRows - 1) * 32;

  const option = useMemo(() => {
    const times = data.map((d) => d.time);
    const speeds100 = data.map((d) => d.speed_100m);
    const speeds10 = data.map((d) => d.speed_10m);
    const speedsMax = data.map((d) => d.speed_max ?? null);
    const speedsMeasured = data.map((d) => d.speed_measured ?? null);
    const invalidFlags = data.map((d) => d.invalid_wind_pct ?? 0);

    const isCyan = model === 'ERA5';
    const primaryColor = isCyan ? '#06b6d4' : '#f59e0b';
    const measuredColor = '#10b981'; // Emerald para série medida ativa
    const secondaryColor = '#818cf8'; // Índigo para vento 10m

    const seriesList: any[] = [
      {
        name: 'Vento a 100m (Hub)',
        type: 'line',
        yAxisIndex: 0,
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
    ];

    if (hasMeasured) {
      seriesList.push({
        name: mainMeasuredLabel,
        type: 'line',
        yAxisIndex: 0,
        data: speedsMeasured,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2.5, color: measuredColor },
        itemStyle: { color: measuredColor },
      });
    }

    // Séries individuais das usinas do complexo
    plantNames.forEach((p, idx) => {
      const pColor = PLANT_COLORS[idx % PLANT_COLORS.length];
      seriesList.push({
        name: `Usina: ${p}`,
        type: 'line',
        yAxisIndex: 0,
        data: data.map((d) => d.plant_speeds?.[p] ?? null),
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1.2, type: 'dashed', color: pColor },
        itemStyle: { color: pColor },
      });
    });

    seriesList.push({
      name: 'Vento a 10m (Superfície)',
      type: 'line',
      yAxisIndex: 0,
      data: speeds10,
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 1.5, color: secondaryColor },
      itemStyle: { color: secondaryColor },
    });

    if (aggregation === 'daily') {
      seriesList.push({
        name: 'Rajada Máxima Diária',
        type: 'line',
        yAxisIndex: 0,
        data: speedsMax,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1, type: 'dotted', color: '#f87171' },
        itemStyle: { color: '#f87171' },
      });
    }

    if (hasInvalid) {
      seriesList.push({
        name: 'Flag Vento Inválido (%)',
        type: 'bar',
        yAxisIndex: 1,
        data: invalidFlags,
        barMaxWidth: 6,
        itemStyle: {
          color: 'rgba(244, 63, 94, 0.45)',
          borderRadius: [2, 2, 0, 0],
        },
      });
    }

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
        type: 'plain',
        data: legendItems,
        textStyle: { color: '#a1a1aa', fontSize: 11 },
        top: 4,
        left: 20,
        right: 65,
        orient: 'horizontal',
        itemGap: 14,
        itemWidth: 20,
        itemHeight: 10,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: gridTop,
        containLabel: true,
      },
      toolbox: {
        top: 4,
        right: 12,
        feature: {
          dataZoom: { yAxisIndex: 'none' },
          restore: {},
          saveAsImage: { name: `WindSeries_${nodeTitle}` },
        },
        iconStyle: { borderColor: '#a1a1aa' },
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
      yAxis: [
        {
          type: 'value',
          name: 'Velocidade (m/s)',
          nameTextStyle: { color: '#a1a1aa', fontSize: 11 },
          axisLine: { lineStyle: { color: '#3f3f46' } },
          axisLabel: { color: '#a1a1aa', fontSize: 11, formatter: '{value} m/s' },
          splitLine: { lineStyle: { color: '#27272a', type: 'dashed' } },
        },
        {
          type: 'value',
          name: 'Vento Inválido (%)',
          nameTextStyle: { color: '#f43f5e', fontSize: 11 },
          min: 0,
          max: 100,
          axisLine: { lineStyle: { color: '#f43f5e' } },
          axisLabel: { color: '#f43f5e', fontSize: 11, formatter: '{value}%' },
          splitLine: { show: false },
        },
      ],
      series: seriesList,
    };
  }, [data, nodeTitle, model, aggregation, selectedPlant, plantNames]);

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
            Velocidade média a 100m (rotor), anemômetros reais das usinas do parque e taxa de dado inválido no eixo secundário
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {availablePlants && availablePlants.length > 1 && (
            <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800 text-xs">
              <span className="text-zinc-500 font-medium">Usina:</span>
              <select
                value={selectedPlant}
                onChange={(e) => onSelectPlant && onSelectPlant(e.target.value)}
                className="bg-transparent text-emerald-400 font-semibold focus:outline-none cursor-pointer"
              >
                {availablePlants.map((p) => (
                  <option key={p} value={p} className="bg-zinc-900 text-zinc-200">
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}

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
      </div>

      {isLoading ? (
        <div
          className="flex items-center justify-center text-xs text-zinc-500 transition-all duration-300"
          style={{ height: `${dynamicChartHeight}px` }}
        >
          Carregando série temporal de reanálise...
        </div>
      ) : data.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center text-xs text-zinc-500 space-y-2 transition-all duration-300"
          style={{ height: `${dynamicChartHeight}px` }}
        >
          <p>Nenhuma série carregada para este nó.</p>
          <p className="text-zinc-600">Clique em "Baixar Série" para processar dados de 30 anos.</p>
        </div>
      ) : (
        <div
          className="w-full transition-all duration-300"
          style={{ height: `${dynamicChartHeight}px` }}
        >
          <ReactECharts
            option={option}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'canvas' }}
          />
        </div>
      )}
    </div>
  );
};