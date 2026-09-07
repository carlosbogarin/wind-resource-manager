import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCompanies,
  fetchEnsembles,
  fetchNodes,
  fetchTimeSeries,
  fetchAnalytics,
  downloadNodeData,
  fetchDateRange,
} from './services/api';
import { ReanalysisNode, Ensemble } from './types';
import { Sidebar, ActiveModule } from './components/Sidebar';
import { Header } from './components/Header';
import { CompanySelector } from './components/CompanySelector';
import { EnsembleSelector } from './components/EnsembleSelector';
import { MapView } from './components/MapView';
import { NodesGridTable } from './components/NodesGridTable';
import { TimeSeriesChart } from './components/TimeSeriesChart';
import { DiurnalProfileChart } from './components/DiurnalProfileChart';
import { SeasonalityChart } from './components/SeasonalityChart';
import { WindRoseChart } from './components/WindRoseChart';
import { WeibullChart } from './components/WeibullChart';
import { CapacityFactorComparison } from './components/CapacityFactorComparison';
import { ExportToolbar } from './components/ExportToolbar';
import { CatalogView } from './components/CatalogView';
import { DossierView } from './components/DossierView';
import { MethodologyView } from './components/MethodologyView';
import {
  BarChart3,
  Compass,
  Clock,
  Zap,
  Download,
  AlertCircle,
  CheckCircle2,
  Calendar,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export const App: React.FC = () => {
  const queryClient = useQueryClient();

  // 1. Theme State: Light / Dark Mode
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('wrm_theme');
    return saved === 'dark' || saved === 'light' ? saved : 'dark';
  });

  useEffect(() => {
    localStorage.setItem('wrm_theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      document.body.classList.add('light');
      document.body.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    }
  }, [theme]);

  // 2. Navigation Module State
  const [activeModule, setActiveModule] = useState<ActiveModule>('reanalysis');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // 3. Selection State
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedIdOns, setSelectedIdOns] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<ReanalysisNode | null>(null);
  const [startYear, setStartYear] = useState<number>(1994);
  const [endYear, setEndYear] = useState<number>(2024);
  const [aggregation, setAggregation] = useState<'daily' | 'monthly' | 'hourly'>('daily');
  const [activeTab, setActiveTab] = useState<'timeseries' | 'rose_weibull' | 'profiles' | 'ons'>('timeseries');
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // 3.1. Fetch Dynamically Synchronized 30-Year Date Range (Emparelhamento ERA5 e MERRA-2)
  const { data: dateRangeData } = useQuery({
    queryKey: ['date-range'],
    queryFn: fetchDateRange,
    staleTime: 1000 * 60 * 60 * 6, // 6 horas em cache
  });

  // Auto-sincroniza startYear e endYear quando os dados de emparelhamento chegarem
  useEffect(() => {
    if (dateRangeData) {
      setStartYear(dateRangeData.start_year);
      setEndYear(dateRangeData.end_year);
    }
  }, [dateRangeData]);

  // 4. Fetch Companies
  const { data: companies = [], isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
  });

  // Auto-select first company
  useEffect(() => {
    if (companies.length > 0 && !selectedCompany) {
      setSelectedCompany(companies[0].company_name);
    }
  }, [companies, selectedCompany]);

  // 5. Fetch Ensembles of Selected Company
  const { data: ensembles = [], isLoading: isLoadingEnsembles } = useQuery({
    queryKey: ['ensembles', selectedCompany],
    queryFn: () => (selectedCompany ? fetchEnsembles(selectedCompany) : Promise.resolve([])),
    enabled: !!selectedCompany,
  });

  // Auto-select first ensemble when company changes
  useEffect(() => {
    if (ensembles.length > 0) {
      setSelectedIdOns(ensembles[0].id_ons);
    } else {
      setSelectedIdOns(null);
    }
  }, [ensembles]);

  // 6. Fetch Grid Nodes for Selected Ensemble
  const { data: nodesData, isLoading: isLoadingNodes } = useQuery({
    queryKey: ['nodes', selectedIdOns],
    queryFn: () => (selectedIdOns ? fetchNodes(selectedIdOns) : Promise.resolve(null)),
    enabled: !!selectedIdOns,
  });

  // Default selected node to closest ERA5 node
  useEffect(() => {
    if (nodesData && nodesData.era5_nodes.length > 0) {
      const closestEra5 = [...nodesData.era5_nodes].sort((a, b) => a.distance_km - b.distance_km)[0];
      setSelectedNode(closestEra5);
    }
  }, [nodesData]);

  // 7. Download Mutation
  const downloadMutation = useMutation({
    mutationFn: downloadNodeData,
    onSuccess: (data) => {
      setNotification({
        type: 'success',
        text: `Download concluído para ${data.node_id} (${data.records_count} horas salvas em Parquet).`,
      });
      queryClient.invalidateQueries({ queryKey: ['timeseries'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['nodes'] });
    },
    onError: (err: any) => {
      setNotification({
        type: 'error',
        text: `Erro no download: ${err?.response?.data?.detail || err.message}`,
      });
    },
  });

  const handleDownloadNode = (node: ReanalysisNode) => {
    setNotification({
      type: 'info',
      text: `Iniciando download sob demanda para o nó ${node.node_id} (${node.model}, ${startYear}-${endYear})...`,
    });
    downloadMutation.mutate({
      node_id: node.node_id,
      model: node.model,
      latitude: node.latitude,
      longitude: node.longitude,
      start_year: startYear,
      end_year: endYear,
      force: false,
    });
  };

  const handleDownloadAllNodes = async () => {
    if (!nodesData) return;
    const all = [...nodesData.era5_nodes, ...nodesData.merra2_nodes];
    setNotification({
      type: 'info',
      text: `Iniciando download sequencial dos 8 nós para ${nodesData.substation.ensemble_name}...`,
    });
    for (const node of all) {
      try {
        await downloadNodeData({
          node_id: node.node_id,
          model: node.model,
          latitude: node.latitude,
          longitude: node.longitude,
          start_year: startYear,
          end_year: endYear,
          force: false,
        });
      } catch (err: any) {
        console.error('Erro no download do nó', node.node_id, err);
      }
    }
    queryClient.invalidateQueries({ queryKey: ['timeseries'] });
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
    queryClient.invalidateQueries({ queryKey: ['nodes'] });
    setNotification({
      type: 'success',
      text: `Download de todos os nós finalizado com sucesso!`,
    });
  };

  // 8. Fetch Time Series
  const { data: timeseriesData, isLoading: isLoadingSeries } = useQuery({
    queryKey: [
      'timeseries',
      selectedNode?.node_id,
      selectedNode?.model,
      selectedNode?.latitude,
      selectedNode?.longitude,
      startYear,
      endYear,
      aggregation,
    ],
    queryFn: () =>
      selectedNode
        ? fetchTimeSeries({
            node_id: selectedNode.node_id,
            model: selectedNode.model,
            latitude: selectedNode.latitude,
            longitude: selectedNode.longitude,
            start_year: startYear,
            end_year: endYear,
            aggregation,
          })
        : Promise.resolve(null),
    enabled: !!selectedNode,
  });

  // 9. Fetch Analytics
  const { data: analyticsData, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: [
      'analytics',
      selectedNode?.node_id,
      selectedNode?.model,
      selectedNode?.latitude,
      selectedNode?.longitude,
      selectedIdOns,
      startYear,
      endYear,
    ],
    queryFn: () =>
      selectedNode
        ? fetchAnalytics({
            node_id: selectedNode.node_id,
            model: selectedNode.model,
            latitude: selectedNode.latitude,
            longitude: selectedNode.longitude,
            id_ons: selectedIdOns || undefined,
            start_year: startYear,
            end_year: endYear,
          })
        : Promise.resolve(null),
    enabled: !!selectedNode,
  });

  const activeEnsemble = ensembles.find((e) => e.id_ons === selectedIdOns);
  const isLight = theme === 'light';

  return (
    <div className={`min-h-screen flex ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-zinc-950 text-zinc-100'}`}>
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        totalEnsembles={ensembles.length}
        totalCompanies={companies.length}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        theme={theme}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header without unnecessary pills, with theme toggle */}
        <Header
          activeEnsembleName={activeEnsemble?.ensemble_name}
          theme={theme}
          onToggleTheme={setTheme}
          onToggleSidebar={() => setIsSidebarOpen(true)}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
          {/* Notification Toast */}
          {notification && (
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                notification.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-500/50 text-emerald-800 dark:text-emerald-300'
                  : notification.type === 'error'
                  ? 'bg-red-50 dark:bg-red-950/50 border-red-300 dark:border-red-500/50 text-red-800 dark:text-red-300'
                  : 'bg-cyan-50 dark:bg-cyan-950/50 border-cyan-300 dark:border-cyan-500/50 text-cyan-800 dark:text-cyan-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {notification.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : notification.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                ) : (
                  <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400 animate-spin" />
                )}
                <span>{notification.text}</span>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold ml-4"
              >
                ×
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODULE 1: REANÁLISES (VISÃO COMPLETA PRINCIPAL)           */}
          {/* ======================================================== */}
          {activeModule === 'reanalysis' && (
            <div className="space-y-6">
              {/* Top Controls: 2-Step Selector + Period (Z-Index alto para ficar na frente de todos os componentes) */}
              <section className={`relative z-40 grid grid-cols-1 md:grid-cols-12 gap-4 border rounded-2xl p-5 shadow-lg backdrop-blur-sm ${
                isLight ? 'bg-white/80 border-slate-200 shadow-slate-200/50' : 'bg-zinc-900/60 border-zinc-800/80 shadow-black/40'
              }`}>
                <div className="md:col-span-5 relative z-50">
                  <CompanySelector
                    companies={companies}
                    selectedCompany={selectedCompany}
                    onSelectCompany={(comp) => {
                      setSelectedCompany(comp);
                      setSelectedIdOns(null);
                    }}
                    isLoading={isLoadingCompanies}
                  />
                </div>

                <div className="md:col-span-4 relative z-40">
                  <EnsembleSelector
                    ensembles={ensembles}
                    selectedIdOns={selectedIdOns}
                    onSelectEnsemble={(id) => setSelectedIdOns(id)}
                    isLoading={isLoadingEnsembles}
                    disabled={!selectedCompany}
                  />
                </div>

                <div className="md:col-span-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span>Período (30 Anos)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (dateRangeData) {
                          setStartYear(dateRangeData.start_year);
                          setEndYear(dateRangeData.end_year);
                        } else {
                          setStartYear(1996);
                          setEndYear(2026);
                        }
                      }}
                      title="Restaurar período dinâmico emparelhado (30 anos)"
                      className={`p-1 rounded-md border text-[11px] flex items-center gap-1 transition-all ${
                        isLight
                          ? 'border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                          : 'border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span className="hidden sm:inline">Padrão</span>
                    </button>
                  </div>

                  <div className={`flex items-center justify-between gap-1.5 border rounded-xl p-2 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900 border-zinc-800'
                  }`}>
                    <input
                      type="number"
                      min={1980}
                      max={2026}
                      value={startYear}
                      onChange={(e) => setStartYear(parseInt(e.target.value) || 1996)}
                      className={`w-20 border rounded-lg px-2 py-1 text-center font-mono text-xs font-semibold ${
                        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-950 border-zinc-700 text-white'
                      }`}
                    />
                    <span className="text-zinc-400 font-bold text-xs">até</span>
                    <input
                      type="number"
                      min={1980}
                      max={2026}
                      value={endYear}
                      onChange={(e) => setEndYear(parseInt(e.target.value) || 2026)}
                      className={`w-20 border rounded-lg px-2 py-1 text-center font-mono text-xs font-semibold ${
                        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-950 border-zinc-700 text-white'
                      }`}
                    />
                  </div>

                  {dateRangeData && (
                    <div
                      className="mt-1.5 flex items-center gap-1.5 text-[10px] text-cyan-600 dark:text-cyan-400 font-medium truncate"
                      title={dateRangeData.explanation}
                    >
                      <Sparkles className="w-3 h-3 shrink-0 text-amber-500" />
                      <span className="truncate">
                        Emparelhado: Ref {dateRangeData.limiting_model} ({dateRangeData.end_year})
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {/* Geospatial Map & Nodes Table */}
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h2 className={`text-lg font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      <span>SE Coletora & Nós de Reanálise</span>
                      {activeEnsemble && (
                        <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          SE: {activeEnsemble.latitude.toFixed(4)}, {activeEnsemble.longitude.toFixed(4)}
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      Visualização geoespacial com as 4 coordenadas mais próximas de ERA5 (0.25°) e MERRA-2 (0.5°x0.625°)
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadAllNodes}
                      disabled={downloadMutation.isPending || !nodesData}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-medium text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar Todos os 8 Nós (30 Anos)</span>
                    </button>
                  </div>
                </div>

                {/* Map (Free OpenStreetMap & Satellite, no key required) */}
                <MapView
                  substation={nodesData?.substation || null}
                  era5Nodes={nodesData?.era5_nodes || []}
                  merra2Nodes={nodesData?.merra2_nodes || []}
                  selectedNodeId={selectedNode?.node_id || null}
                  onSelectNode={(node) => setSelectedNode(node)}
                  theme={theme}
                />

                <NodesGridTable
                  substation={nodesData?.substation || null}
                  era5Nodes={nodesData?.era5_nodes || []}
                  merra2Nodes={nodesData?.merra2_nodes || []}
                  selectedNode={selectedNode}
                  onSelectNode={(node) => setSelectedNode(node)}
                  onDownloadNode={handleDownloadNode}
                  isDownloading={downloadMutation.isPending}
                />
              </section>

              {/* Selected Node Status & Export Toolbar */}
              {selectedNode && (
                <ExportToolbar
                  selectedNodeId={selectedNode.node_id}
                  model={selectedNode.model}
                  latitude={selectedNode.latitude}
                  longitude={selectedNode.longitude}
                  startYear={startYear}
                  endYear={endYear}
                  isCached={selectedNode.is_cached}
                />
              )}

              {/* Analytical Tabs */}
              <section className="space-y-4">
                <div className={`flex items-center gap-2 border-b pb-2 overflow-x-auto ${
                  isLight ? 'border-slate-200' : 'border-zinc-800'
                }`}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('timeseries')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      activeTab === 'timeseries'
                        ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Série Temporal Completa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('rose_weibull')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      activeTab === 'rose_weibull'
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    <Compass className="w-4 h-4" />
                    <span>Rosa dos Ventos & Weibull</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('profiles')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      activeTab === 'profiles'
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>Perfis Diurno & Sazonal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('ons')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      activeTab === 'ons'
                        ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    <span>Fator de Capacidade Real ONS</span>
                  </button>
                </div>

                {/* Tab 1: Time Series Chart */}
                {activeTab === 'timeseries' && (
                  <TimeSeriesChart
                    data={timeseriesData?.series || []}
                    nodeTitle={selectedNode ? `${selectedNode.node_id} (${selectedNode.position})` : 'Nenhum'}
                    model={selectedNode?.model || 'ERA5'}
                    aggregation={aggregation}
                    onChangeAggregation={(agg) => setAggregation(agg)}
                    isLoading={isLoadingSeries}
                  />
                )}

                {/* Tab 2: Wind Rose & Weibull */}
                {activeTab === 'rose_weibull' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {analyticsData?.wind_rose ? (
                      <WindRoseChart data={analyticsData.wind_rose} />
                    ) : (
                      <div className={`h-[320px] rounded-2xl border flex items-center justify-center text-xs text-zinc-500 ${
                        isLight ? 'bg-white border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
                      }`}>
                        {isLoadingAnalytics ? 'Calculando Rosa dos Ventos...' : 'Baixe a série temporal para ver a Rosa dos Ventos.'}
                      </div>
                    )}

                    {analyticsData?.weibull ? (
                      <WeibullChart data={analyticsData.weibull} />
                    ) : (
                      <div className={`h-[320px] rounded-2xl border flex items-center justify-center text-xs text-zinc-500 ${
                        isLight ? 'bg-white border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
                      }`}>
                        {isLoadingAnalytics ? 'Ajustando distribuição de Weibull...' : 'Baixe a série temporal para ver o ajuste de Weibull.'}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 3: Diurnal & Seasonality Profiles */}
                {activeTab === 'profiles' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {analyticsData?.diurnal_profile ? (
                      <DiurnalProfileChart
                        data={analyticsData.diurnal_profile}
                        model={selectedNode?.model || 'ERA5'}
                      />
                    ) : (
                      <div className={`h-[280px] rounded-2xl border flex items-center justify-center text-xs text-zinc-500 ${
                        isLight ? 'bg-white border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
                      }`}>
                        {isLoadingAnalytics ? 'Calculando perfil diurno...' : 'Baixe a série temporal para ver o perfil diurno.'}
                      </div>
                    )}

                    {analyticsData?.monthly_seasonality ? (
                      <SeasonalityChart
                        data={analyticsData.monthly_seasonality}
                        model={selectedNode?.model || 'ERA5'}
                      />
                    ) : (
                      <div className={`h-[280px] rounded-2xl border flex items-center justify-center text-xs text-zinc-500 ${
                        isLight ? 'bg-white border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
                      }`}>
                        {isLoadingAnalytics ? 'Calculando sazonalidade...' : 'Baixe a série temporal para ver a sazonalidade.'}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 4: ONS Real Capacity Factor Comparison */}
                {activeTab === 'ons' && (
                  <CapacityFactorComparison
                    data={analyticsData?.ons_correlation || []}
                    ensembleName={activeEnsemble?.ensemble_name || 'Conjunto'}
                  />
                )}
              </section>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODULE 2: CATÁLOGO ONS                                   */}
          {/* ======================================================== */}
          {activeModule === 'catalog' && (
            <CatalogView
              ensembles={ensembles}
              onSelectEnsemble={(idOns) => {
                setSelectedIdOns(idOns);
                setActiveModule('reanalysis');
              }}
              theme={theme}
            />
          )}

          {/* ======================================================== */}
          {/* MODULE 3: DOSSIÊ & EXPORTAÇÃO                            */}
          {/* ======================================================== */}
          {activeModule === 'dossier' && (
            <DossierView
              ensemble={activeEnsemble || null}
              companyName={selectedCompany}
              selectedNode={selectedNode}
              startYear={startYear}
              endYear={endYear}
              theme={theme}
            />
          )}

          {/* ======================================================== */}
          {/* MODULE 4: METODOLOGIA                                    */}
          {/* ======================================================== */}
          {activeModule === 'methodology' && (
            <MethodologyView theme={theme} />
          )}
        </main>

        {/* Footer */}
        <footer className={`border-t py-6 px-4 text-center text-xs ${
          isLight ? 'border-slate-200 bg-white text-slate-500' : 'border-zinc-900 bg-zinc-950 text-zinc-500'
        }`}>
          <p>
            <strong>Wind Resource Manager</strong> • Padrão Ouro para Avaliação de Recurso Eólico no Brasil
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            Dados: ONS (Fator de Capacidade & Capacidade de Geração) • ECMWF ERA5 (0.25°) • NASA MERRA-2 (0.5°x0.625°)
          </p>
        </footer>
      </div>
    </div>
  );
};