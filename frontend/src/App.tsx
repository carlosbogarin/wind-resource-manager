import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCompanies,
  fetchEnsembles,
  fetchNodes,
  fetchNodesByCoordinates,
  runSpatialInterpolation,
  fetchTimeSeries,
  fetchAnalytics,
  fetchCorrelation,
  downloadNodeData,
  fetchDateRange,
  fetchEnsemblePlants,
} from './services/api';
import { ReanalysisNode, Ensemble, CompanySummary } from './types';
import { Sidebar, ActiveModule } from './components/Sidebar';
import { Header } from './components/Header';
import { CompanySelector } from './components/CompanySelector';
import { EnsembleSelector } from './components/EnsembleSelector';
import { ManualCoordinatesSelector } from './components/ManualCoordinatesSelector';
import { VortexExtrapolationCard } from './components/VortexExtrapolationCard';
import { MapView } from './components/MapView';
import { NodesGridTable } from './components/NodesGridTable';
import { TimeSeriesChart } from './components/TimeSeriesChart';
import { LinearCorrelationChart } from './components/LinearCorrelationChart';
import { DiurnalProfileChart } from './components/DiurnalProfileChart';
import { SeasonalityChart } from './components/SeasonalityChart';
import { WindRoseChart } from './components/WindRoseChart';
import { WeibullChart } from './components/WeibullChart';
import { CapacityFactorComparison } from './components/CapacityFactorComparison';
import { ExportToolbar } from './components/ExportToolbar';
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
  GitCompare,
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
  const isManualModule = activeModule === 'reanalysis_manual';

  // 3. Selection State - ONS
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedIdOns, setSelectedIdOns] = useState<string | null>(null);
  const [onsSelectedNode, setOnsSelectedNode] = useState<ReanalysisNode | null>(null);
  const [onsIsExtrapolatedActive, setOnsIsExtrapolatedActive] = useState<boolean>(false);
  const [onsSavedGridNode, setOnsSavedGridNode] = useState<ReanalysisNode | null>(null);
  const [onsExtrapolatedModel, setOnsExtrapolatedModel] = useState<'ERA5' | 'MERRA-2'>('ERA5');
  const [onsExtrapolationDetails, setOnsExtrapolationDetails] = useState<{
    recordsCount?: number;
    fileSizeMb?: number;
    cached?: boolean;
    weights?: Record<string, number>;
  } | null>(null);
  const [onsHasExtrapolatedSeries, setOnsHasExtrapolatedSeries] = useState<boolean>(false);

  // 3.1. Selection State - Manual (Totalmente independente do ONS)
  const [manualLat, setManualLat] = useState<number>(-14.1028);
  const [manualLon, setManualLon] = useState<number>(-42.6094);
  const [manualSiteName, setManualSiteName] = useState<string>('Caetité (Ponto Manual)');
  const [manualSelectedNode, setManualSelectedNode] = useState<ReanalysisNode | null>(null);
  const [manualIsExtrapolatedActive, setManualIsExtrapolatedActive] = useState<boolean>(false);
  const [manualSavedGridNode, setManualSavedGridNode] = useState<ReanalysisNode | null>(null);
  const [manualExtrapolatedModel, setManualExtrapolatedModel] = useState<'ERA5' | 'MERRA-2'>('ERA5');
  const [manualExtrapolationDetails, setManualExtrapolationDetails] = useState<{
    recordsCount?: number;
    fileSizeMb?: number;
    cached?: boolean;
    weights?: Record<string, number>;
  } | null>(null);
  const [manualHasExtrapolatedSeries, setManualHasExtrapolatedSeries] = useState<boolean>(false);

  // Estados derivados conforme o módulo ativo
  const selectedNode = isManualModule ? manualSelectedNode : onsSelectedNode;
  const setSelectedNode = (node: ReanalysisNode | null) => {
    if (isManualModule) setManualSelectedNode(node);
    else setOnsSelectedNode(node);
  };

  const isExtrapolatedActive = isManualModule ? manualIsExtrapolatedActive : onsIsExtrapolatedActive;
  const setIsExtrapolatedActive = (val: boolean | ((prev: boolean) => boolean)) => {
    if (isManualModule) {
      setManualIsExtrapolatedActive(val);
    } else {
      setOnsIsExtrapolatedActive(val);
    }
  };

  const extrapolationDetails = isManualModule ? manualExtrapolationDetails : onsExtrapolationDetails;
  const setExtrapolationDetails = (val: any) => {
    if (isManualModule) setManualExtrapolationDetails(val);
    else setOnsExtrapolationDetails(val);
  };

  const hasExtrapolatedSeries = isManualModule ? manualHasExtrapolatedSeries : onsHasExtrapolatedSeries;
  const setHasExtrapolatedSeries = (val: boolean | ((prev: boolean) => boolean)) => {
    if (isManualModule) {
      setManualHasExtrapolatedSeries(val);
    } else {
      setOnsHasExtrapolatedSeries(val);
    }
  };

  const extrapolatedModel = isManualModule ? manualExtrapolatedModel : onsExtrapolatedModel;
  const setExtrapolatedModel = (val: 'ERA5' | 'MERRA-2') => {
    if (isManualModule) setManualExtrapolatedModel(val);
    else setOnsExtrapolatedModel(val);
  };

  const savedGridNode = isManualModule ? manualSavedGridNode : onsSavedGridNode;
  const setSavedGridNode = (node: ReanalysisNode | null) => {
    if (isManualModule) setManualSavedGridNode(node);
    else setOnsSavedGridNode(node);
  };

  // Limpa notificações ao trocar de módulo para garantir independência total
  useEffect(() => {
    setNotification(null);
  }, [activeModule]);

  // Common UI State
  const [startPeriod, setStartPeriod] = useState<string>('1996-08');
  const [endPeriod, setEndPeriod] = useState<string>('2026-08');
  const [aggregation, setAggregation] = useState<'daily' | 'monthly' | 'hourly'>('daily');
  const [correlationAgg, setCorrelationAgg] = useState<'hourly' | 'daily' | 'weekly' | 'monthly'>('hourly');
  const [selectedPlant, setSelectedPlant] = useState<string>('Média do Conjunto');
  const [activeTab, setActiveTab] = useState<'timeseries' | 'correlation' | 'rose_weibull' | 'profiles' | 'ons'>('timeseries');
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const autoDownloadedEnsembleRef = React.useRef<string | null>(null);

  // Anos inteiros derivados para carregamento de arquivos e queries base
  const startYear = parseInt(startPeriod.split('-')[0]) || 1996;
  const endYear = parseInt(endPeriod.split('-')[0]) || 2026;

  // 3.1. Fetch Dynamically Synchronized 30-Year Date Range (Emparelhamento ERA5 e MERRA-2)
  const { data: dateRangeData } = useQuery({
    queryKey: ['date-range'],
    queryFn: fetchDateRange,
    staleTime: 1000 * 60 * 60 * 6, // 6 horas em cache
  });

  // Auto-sincroniza startPeriod e endPeriod quando os dados de emparelhamento chegarem
  useEffect(() => {
    if (dateRangeData) {
      if (dateRangeData.start_year_month) {
        setStartPeriod(dateRangeData.start_year_month);
      }
      if (dateRangeData.end_year_month) {
        setEndPeriod(dateRangeData.end_year_month);
      }
    }
  }, [dateRangeData]);

  // 4. Fetch Companies
  const { data: rawCompanies = [], isLoading: isLoadingCompanies } = useQuery<CompanySummary[]>({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
  });

  const companies = useMemo<CompanySummary[]>(() => {
    return [...rawCompanies].sort((a, b) =>
      a.company_name.localeCompare(b.company_name, 'pt-BR', { sensitivity: 'base' })
    );
  }, [rawCompanies]);

  // Auto-select first company
  useEffect(() => {
    if (companies.length > 0 && !selectedCompany) {
      setSelectedCompany(companies[0].company_name);
    }
  }, [companies, selectedCompany]);

  // 5. Fetch Ensembles of Selected Company
  const { data: rawEnsembles = [], isLoading: isLoadingEnsembles } = useQuery<Ensemble[]>({
    queryKey: ['ensembles', selectedCompany],
    queryFn: () => (selectedCompany ? fetchEnsembles(selectedCompany) : Promise.resolve([])),
    enabled: !!selectedCompany,
  });

  const ensembles = useMemo<Ensemble[]>(() => {
    return [...rawEnsembles].sort((a, b) =>
      a.ensemble_name.localeCompare(b.ensemble_name, 'pt-BR', { sensitivity: 'base' })
    );
  }, [rawEnsembles]);

  // Auto-select first ensemble when company changes
  useEffect(() => {
    if (ensembles.length > 0) {
      setSelectedIdOns(ensembles[0].id_ons);
    } else {
      setSelectedIdOns(null);
    }
  }, [ensembles]);

  // 6. Fetch Grid Nodes for Selected Ensemble (ONS)
  const { data: nodesData, isLoading: isLoadingNodes } = useQuery({
    queryKey: ['nodes', selectedIdOns],
    queryFn: () => (selectedIdOns ? fetchNodes(selectedIdOns) : Promise.resolve(null)),
    enabled: !!selectedIdOns,
  });

  // 6.1. Fetch Grid Nodes for Manual Coordinates (Reanálises - Manual)
  const {
    data: manualNodesData,
    isLoading: isLoadingManualNodes,
    refetch: refetchManualNodes,
  } = useQuery({
    queryKey: ['nodes-manual', manualLat, manualLon, manualSiteName],
    queryFn: () => fetchNodesByCoordinates(manualLat, manualLon, manualSiteName),
    enabled: activeModule === 'reanalysis_manual',
  });

  const currentNodesData = isManualModule ? manualNodesData : nodesData;
  const currentSubstation = currentNodesData?.substation || null;

  const [downloadingNodeId, setDownloadingNodeId] = useState<string | null>(null);

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
      queryClient.invalidateQueries({ queryKey: ['correlation'] });
      queryClient.invalidateQueries({ queryKey: ['nodes'] });
      queryClient.invalidateQueries({ queryKey: ['nodes-manual'] });
    },
    onError: (err: any) => {
      setNotification({
        type: 'error',
        text: `Erro no download: ${err?.response?.data?.detail || err.message}`,
      });
    },
  });

  const handleDownloadNode = (node: ReanalysisNode, forceReload: boolean = false) => {
    setSelectedNode(node);
    setDownloadingNodeId(node.node_id);
    const isReload = forceReload;
    setNotification({
      type: 'info',
      text: `${isReload ? 'Atualizando' : 'Obtendo'} série temporal para ${node.node_id} (${node.model}, ${startPeriod} a ${endPeriod})...`,
    });
    downloadMutation.mutate(
      {
        node_id: node.node_id,
        model: node.model,
        latitude: node.latitude,
        longitude: node.longitude,
        start_year: startYear,
        end_year: endYear,
        start_month: startPeriod,
        end_month: endPeriod,
        force: isReload,
      },
      {
        onSettled: () => {
          setDownloadingNodeId(null);
        },
      }
    );
  };

  // 7.1. Spatial IDW Extrapolation Mutation (Vortex FdC Methodology)
  const interpolateMutation = useMutation({
    mutationFn: runSpatialInterpolation,
    onSuccess: (data) => {
      setNotification({
        type: 'success',
        text: `Extrapolação vetorial horizontal (${data.model}) calculada para ${data.site_name}: ${data.records_count.toLocaleString('pt-BR')} horas processadas.`,
      });
      setExtrapolationDetails({
        recordsCount: data.records_count,
        fileSizeMb: data.file_size_mb,
        cached: data.cached,
        weights: data.weights,
      });
      setExtrapolatedModel(data.model as 'ERA5' | 'MERRA-2');
      setHasExtrapolatedSeries(true);

      const synthNode: ReanalysisNode = {
        node_id: data.synthetic_node_id,
        model: data.model as 'ERA5' | 'MERRA-2',
        position: 'SYNTHETIC',
        latitude: data.latitude,
        longitude: data.longitude,
        distance_km: 0,
        bearing_deg: 0,
        cardinal_direction: 'Local',
        weight: 1.0,
        is_cached: true,
        is_interpolated: true,
      };

      if (!isExtrapolatedActive && selectedNode && !selectedNode.is_interpolated) {
        setSavedGridNode(selectedNode);
      }
      setSelectedNode(synthNode);
      setIsExtrapolatedActive(true);

      queryClient.invalidateQueries({ queryKey: ['timeseries'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['correlation'] });
    },
    onError: (err: any) => {
      setNotification({
        type: 'error',
        text: `Erro na extrapolação: ${err?.response?.data?.detail || err.message}`,
      });
    },
  });

  const handleRunExtrapolation = async (model: 'ERA5' | 'MERRA-2') => {
    if (!currentSubstation) return;
    setNotification({
      type: 'info',
      text: `Iniciando extrapolação espacial vetorial (${model}) para ${currentSubstation.ensemble_name}...`,
    });
    interpolateMutation.mutate({
      model,
      latitude: currentSubstation.latitude,
      longitude: currentSubstation.longitude,
      site_name: currentSubstation.ensemble_name,
      start_year: startYear,
      end_year: endYear,
      force: false,
    });
  };

  const handleToggleExtrapolated = (active: boolean) => {
    setIsExtrapolatedActive(active);
    if (active && currentSubstation) {
      const synthNode: ReanalysisNode = {
        node_id: `VORTEX-${extrapolatedModel}`,
        model: extrapolatedModel,
        position: 'SYNTHETIC',
        latitude: currentSubstation.latitude,
        longitude: currentSubstation.longitude,
        distance_km: 0,
        bearing_deg: 0,
        cardinal_direction: 'Local',
        weight: 1.0,
        is_cached: true,
        is_interpolated: true,
      };
      if (selectedNode && !selectedNode.is_interpolated) {
        setSavedGridNode(selectedNode);
      }
      setSelectedNode(synthNode);
    } else if (savedGridNode) {
      setSelectedNode(savedGridNode);
    } else if (currentNodesData) {
      const all = [...currentNodesData.era5_nodes, ...currentNodesData.merra2_nodes];
      const closest = [...all].sort((a, b) => a.distance_km - b.distance_km)[0];
      if (closest) setSelectedNode(closest);
    }
  };

  const handleMapClick = (lat: number, lon: number, placeName?: string) => {
    if (isManualModule) {
      setManualLat(lat);
      setManualLon(lon);
      if (placeName) {
        setManualSiteName(placeName);
      }
      setNotification({
        type: 'info',
        text: `Local selecionado: ${placeName || `${lat.toFixed(4)}, ${lon.toFixed(4)}`}`,
      });
    }
  };

  // Auto-seleciona e baixa automaticamente a reanálise mais próxima no módulo ONS
  useEffect(() => {
    if (!isManualModule && nodesData && selectedIdOns) {
      const allNodes = [...nodesData.era5_nodes, ...nodesData.merra2_nodes];
      if (allNodes.length === 0) return;

      const closestNode = [...allNodes].sort((a, b) => a.distance_km - b.distance_km)[0];

      if (autoDownloadedEnsembleRef.current !== selectedIdOns) {
        autoDownloadedEnsembleRef.current = selectedIdOns;
        setOnsSelectedNode(closestNode);
        setOnsIsExtrapolatedActive(false);
        setOnsHasExtrapolatedSeries(false);
        setOnsExtrapolationDetails(null);

        if (!closestNode.is_cached && !downloadMutation.isPending) {
          handleDownloadNode(closestNode);
        }
      } else if (!onsSelectedNode) {
        setOnsSelectedNode(closestNode);
      } else if (!onsSelectedNode.is_interpolated) {
        const found = allNodes.find(
          (n) => n.node_id === onsSelectedNode.node_id && n.model === onsSelectedNode.model
        );
        if (found) {
          setOnsSelectedNode(found);
        } else {
          setOnsSelectedNode(closestNode);
        }
      }
    }
  }, [isManualModule, nodesData, selectedIdOns, onsSelectedNode]);

  // Auto-seleciona nó mais próximo no módulo Manual
  useEffect(() => {
    if (isManualModule && manualNodesData) {
      const allNodes = [...manualNodesData.era5_nodes, ...manualNodesData.merra2_nodes];
      if (allNodes.length === 0) return;
      const closest = [...allNodes].sort((a, b) => a.distance_km - b.distance_km)[0];
      if (!manualSelectedNode || !allNodes.some((n) => n.node_id === manualSelectedNode.node_id)) {
        setManualSelectedNode(closest);
        setManualIsExtrapolatedActive(false);
        setManualHasExtrapolatedSeries(false);
        setManualExtrapolationDetails(null);
      }
    }
  }, [isManualModule, manualNodesData, manualSelectedNode]);

  const handleDownloadAllNodes = async () => {
    if (!currentNodesData) return;
    const all = [...currentNodesData.era5_nodes, ...currentNodesData.merra2_nodes];
    setNotification({
      type: 'info',
      text: `Iniciando download sequencial dos 8 nós para ${currentNodesData.substation.ensemble_name}...`,
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
          start_month: startPeriod,
          end_month: endPeriod,
          force: false,
        });
      } catch (err: any) {
        console.error('Erro no download do nó', node.node_id, err);
      }
    }
    queryClient.invalidateQueries({ queryKey: ['timeseries'] });
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
    queryClient.invalidateQueries({ queryKey: ['correlation'] });
    queryClient.invalidateQueries({ queryKey: ['nodes'] });
    queryClient.invalidateQueries({ queryKey: ['nodes-manual'] });
    setNotification({
      type: 'success',
      text: `Download de todos os nós finalizado com sucesso!`,
    });
  };

  const activeEnsemble = isManualModule ? undefined : ensembles.find((e) => e.id_ons === selectedIdOns);
  const isLight = theme === 'light';

  // Se estiver em modo manual, garante que abas exclusivas do ONS não fiquem ativas
  useEffect(() => {
    if (isManualModule && (activeTab === 'correlation' || activeTab === 'ons')) {
      setActiveTab('timeseries');
    }
  }, [isManualModule, activeTab]);

  // 7.1 Fetch Ensemble Plants (Usinas do Complexo ONS)
  const { data: ensemblePlants = ['Média do Conjunto'] } = useQuery({
    queryKey: ['ensemble-plants', activeEnsemble?.ensemble_name, selectedIdOns],
    queryFn: () =>
      activeEnsemble?.ensemble_name
        ? fetchEnsemblePlants(activeEnsemble.ensemble_name, selectedIdOns || undefined)
        : Promise.resolve(['Média do Conjunto']),
    enabled: !!activeEnsemble?.ensemble_name,
  });

  useEffect(() => {
    setSelectedPlant('Média do Conjunto');
  }, [selectedIdOns]);

  // 8. Fetch Time Series (com vento medido dos anemômetros da usina ONS EOL)
  const { data: timeseriesData, isLoading: isLoadingSeries } = useQuery({
    queryKey: [
      'timeseries',
      selectedNode?.node_id,
      selectedNode?.model,
      selectedNode?.latitude,
      selectedNode?.longitude,
      activeEnsemble?.ensemble_name,
      selectedPlant,
      startPeriod,
      endPeriod,
      aggregation,
    ],
    queryFn: () =>
      selectedNode
        ? fetchTimeSeries({
            node_id: selectedNode.node_id,
            model: selectedNode.model,
            latitude: selectedNode.latitude,
            longitude: selectedNode.longitude,
            ensemble_name: activeEnsemble?.ensemble_name,
            plant_name: selectedPlant,
            start_year: startYear,
            end_year: endYear,
            start_month: startPeriod,
            end_month: endPeriod,
            aggregation,
          })
        : Promise.resolve(null),
    enabled: !!selectedNode,
  });

  // 8.1 Fetch MCP Linear Correlation (Reanálise vs Medição Real da Usina ONS)
  const { data: correlationData, isLoading: isLoadingCorrelation } = useQuery({
    queryKey: [
      'correlation',
      selectedNode?.node_id,
      selectedNode?.model,
      selectedNode?.latitude,
      selectedNode?.longitude,
      activeEnsemble?.ensemble_name,
      selectedIdOns,
      selectedPlant,
      startPeriod,
      endPeriod,
      correlationAgg,
    ],
    queryFn: () =>
      selectedNode && activeEnsemble?.ensemble_name
        ? fetchCorrelation({
            node_id: selectedNode.node_id,
            model: selectedNode.model,
            latitude: selectedNode.latitude,
            longitude: selectedNode.longitude,
            ensemble_name: activeEnsemble.ensemble_name,
            id_ons: selectedIdOns || undefined,
            plant_name: selectedPlant,
            start_year: startYear,
            end_year: endYear,
            start_month: startPeriod,
            end_month: endPeriod,
            aggregation: correlationAgg,
          })
        : Promise.resolve(null),
    enabled: !!selectedNode && !!activeEnsemble?.ensemble_name,
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
      startPeriod,
      endPeriod,
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
            start_month: startPeriod,
            end_month: endPeriod,
          })
        : Promise.resolve(null),
    enabled: !!selectedNode,
  });

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
          activeEnsembleName={activeModule === 'reanalysis' ? activeEnsemble?.ensemble_name : undefined}
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
          {/* MODULE 1 & 2: REANÁLISES - ONS & REANÁLISES - MANUAL      */}
          {/* ======================================================== */}
          {(activeModule === 'reanalysis' || activeModule === 'reanalysis_manual') && (
            <div className="space-y-6">
              {/* Top Controls: ONS Selectors OR Manual Coordinates Selector */}
              {activeModule === 'reanalysis' ? (
                /* Top Controls: 2-Step Selector + Period (Z-Index alto para ficar na frente de todos os componentes) */
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
                        <span>
                          Período ({(() => {
                            const [sy, sm] = startPeriod.split('-').map(Number);
                            const [ey, em] = endPeriod.split('-').map(Number);
                            if (!sy || !ey) return '30 Anos';
                            const months = (ey - sy) * 12 + ((em || 8) - (sm || 8));
                            const y = Math.round((months / 12) * 10) / 10;
                            return `${y} Anos`;
                          })()})
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (dateRangeData) {
                            setStartPeriod(dateRangeData.start_year_month);
                            setEndPeriod(dateRangeData.end_year_month);
                          } else {
                            setStartPeriod('1996-08');
                            setEndPeriod('2026-08');
                          }
                        }}
                        title="Restaurar período emparelhado padrão de 30 anos (ano-mês)"
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
                        type="text"
                        maxLength={7}
                        placeholder="AAAA-MM"
                        value={startPeriod}
                        onChange={(e) => setStartPeriod(e.target.value)}
                        title="Mês inicial (Formato AAAA-MM)"
                        className={`w-24 border rounded-lg px-2 py-1.5 text-center font-mono text-xs font-bold tracking-wider ${
                          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-zinc-950 border-zinc-700 text-white'
                        }`}
                      />
                      <span className="text-zinc-400 font-bold text-xs">até</span>
                      <input
                        type="text"
                        maxLength={7}
                        placeholder="AAAA-MM"
                        value={endPeriod}
                        onChange={(e) => setEndPeriod(e.target.value)}
                        title="Mês final (Formato AAAA-MM)"
                        className={`w-24 border rounded-lg px-2 py-1.5 text-center font-mono text-xs font-bold tracking-wider ${
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
                          Emparelhado: Ref {dateRangeData.limiting_model} ({dateRangeData.end_year_month || dateRangeData.end_year})
                        </span>
                      </div>
                    )}
                  </div>
                </section>
              ) : (
                /* Top Controls: Manual Coordinates Selector */
                <section className="relative z-40">
                  <ManualCoordinatesSelector
                    latitude={manualLat}
                    longitude={manualLon}
                    siteName={manualSiteName}
                    onChangeCoordinates={(lat, lon, name) => {
                      setManualLat(lat);
                      setManualLon(lon);
                      setManualSiteName(name);
                    }}
                    onSearchNodes={() => {
                      refetchManualNodes();
                      queryClient.invalidateQueries({ queryKey: ['nodes-manual'] });
                    }}
                    isLoading={isLoadingManualNodes}
                    dateRange={dateRangeData || null}
                    startMonth={startPeriod}
                    endMonth={endPeriod}
                    onChangeStartMonth={(val) => setStartPeriod(val)}
                    onChangeEndMonth={(val) => setEndPeriod(val)}
                    onResetPeriod={() => {
                      if (dateRangeData) {
                        setStartPeriod(dateRangeData.start_year_month);
                        setEndPeriod(dateRangeData.end_year_month);
                      } else {
                        setStartPeriod('1996-08');
                        setEndPeriod('2026-08');
                      }
                    }}
                    theme={theme}
                  />
                </section>
              )}

              {/* Geospatial Map & Nodes Table */}
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h2 className={`text-lg font-bold flex items-center gap-2 flex-wrap ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      <span>{isManualModule ? 'Ponto Alvo & Nós de Reanálise' : 'SE Coletora & Nós de Reanálise'}</span>
                      {currentSubstation && (
                        <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {isManualModule ? 'Ponto' : 'SE'}: {currentSubstation.latitude.toFixed(4)}, {currentSubstation.longitude.toFixed(4)}
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      {isManualModule
                        ? 'Visualização geoespacial com as 4 coordenadas mais próximas de ERA5 (0.25°) e MERRA-2 (0.5°x0.625°) para as coordenadas personalizadas'
                        : 'Visualização geoespacial com as 4 coordenadas mais próximas de ERA5 (0.25°) e MERRA-2 (0.5°x0.625°)'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadAllNodes}
                      disabled={downloadMutation.isPending || !currentNodesData}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-medium text-xs shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar Todos os 8 Nós (30 Anos)</span>
                    </button>
                  </div>
                </div>

                {/* Map (Free OpenStreetMap & Satellite, no key required) */}
                <MapView
                  substation={currentSubstation}
                  era5Nodes={currentNodesData?.era5_nodes || []}
                  merra2Nodes={currentNodesData?.merra2_nodes || []}
                  selectedNodeId={selectedNode?.node_id || null}
                  onSelectNode={(node) => {
                    setIsExtrapolatedActive(false);
                    setSelectedNode(node);
                  }}
                  onMapClick={isManualModule ? handleMapClick : undefined}
                  theme={theme}
                />

                <NodesGridTable
                  substation={currentSubstation}
                  era5Nodes={currentNodesData?.era5_nodes || []}
                  merra2Nodes={currentNodesData?.merra2_nodes || []}
                  selectedNode={selectedNode}
                  onSelectNode={(node) => {
                    setIsExtrapolatedActive(false);
                    setSelectedNode(node);
                  }}
                  onDownloadNode={handleDownloadNode}
                  isDownloading={downloadMutation.isPending}
                  downloadingNodeId={downloadingNodeId}
                />
              </section>

              {/* Vortex Extrapolation Card (Available for both ONS and Manual points) */}
              <section>
                <VortexExtrapolationCard
                  substation={currentSubstation}
                  era5Nodes={currentNodesData?.era5_nodes || []}
                  merra2Nodes={currentNodesData?.merra2_nodes || []}
                  selectedModel={selectedNode?.model || 'ERA5'}
                  onRunExtrapolation={handleRunExtrapolation}
                  isExtrapolating={interpolateMutation.isPending}
                  hasExtrapolatedSeries={hasExtrapolatedSeries}
                  isExtrapolatedActive={isExtrapolatedActive}
                  onToggleExtrapolatedActive={handleToggleExtrapolated}
                  extrapolationDetails={extrapolationDetails}
                  theme={theme}
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
                  startPeriod={startPeriod}
                  endPeriod={endPeriod}
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

                  {!isManualModule && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('correlation')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        activeTab === 'correlation'
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                          : isLight
                          ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                      }`}
                    >
                      <GitCompare className="w-4 h-4" />
                      <span>Correlação MCP (Reanálise vs Usina)</span>
                    </button>
                  )}

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
                        ? 'bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/30'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>Perfis Diurno & Sazonal</span>
                  </button>

                  {!isManualModule && (
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
                  )}
                </div>

                {/* Tab 1: Time Series Chart */}
                {activeTab === 'timeseries' && (
                  <TimeSeriesChart
                    data={timeseriesData?.series || []}
                    nodeTitle={selectedNode ? `${selectedNode.node_id} (${selectedNode.position})` : 'Nenhum'}
                    model={selectedNode?.model || 'ERA5'}
                    aggregation={aggregation}
                    onChangeAggregation={(agg) => setAggregation(agg)}
                    availablePlants={timeseriesData?.available_plants || ensemblePlants}
                    selectedPlant={selectedPlant}
                    onSelectPlant={(p) => setSelectedPlant(p)}
                    isLoading={isLoadingSeries}
                  />
                )}

                {/* Tab 1.1: Linear Correlation (MCP) */}
                {activeTab === 'correlation' && (
                  activeEnsemble ? (
                    <LinearCorrelationChart
                      data={correlationData || null}
                      nodeTitle={selectedNode ? `${selectedNode.node_id} (${selectedNode.position})` : 'Nenhum'}
                      model={selectedNode?.model || 'ERA5'}
                      ensembleName={activeEnsemble?.ensemble_name || 'Conjunto'}
                      aggregation={correlationAgg}
                      onChangeAggregation={(agg) => setCorrelationAgg(agg)}
                      availablePlants={correlationData?.available_plants || ensemblePlants}
                      selectedPlant={selectedPlant}
                      onSelectPlant={(p) => setSelectedPlant(p)}
                      isLoading={isLoadingCorrelation}
                    />
                  ) : (
                    <div className={`p-8 rounded-2xl border text-center space-y-3 ${
                      isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-zinc-900/80 border-zinc-800 text-zinc-400'
                    }`}>
                      <GitCompare className="w-8 h-8 text-emerald-500 mx-auto" />
                      <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                        Correlação MCP com Dados Medidos ONS
                      </h3>
                      <p className="text-xs max-w-md mx-auto">
                        A correlação concomitante (MCP) requer a vinculação com uma usina ou conjunto eólico monitorado pelo ONS. No módulo 'Reanálises - ONS', selecione uma empresa e conjunto para comparar a reanálise contra os anemômetros reais.
                      </p>
                    </div>
                  )
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
                  activeEnsemble ? (
                    <CapacityFactorComparison
                      data={analyticsData?.ons_correlation || []}
                      ensembleName={activeEnsemble?.ensemble_name || 'Conjunto'}
                    />
                  ) : (
                    <div className={`p-8 rounded-2xl border text-center space-y-3 ${
                      isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-zinc-900/80 border-zinc-800 text-zinc-400'
                    }`}>
                      <Zap className="w-8 h-8 text-purple-500 mx-auto" />
                      <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                        Fator de Capacidade Real ONS
                      </h3>
                      <p className="text-xs max-w-md mx-auto">
                        O Fator de Capacidade Real é disponibilizado para conjuntos cadastrados na base do ONS. No módulo 'Reanálises - ONS', você poderá cruzar o histórico mensal de geração e FC com a velocidade da reanálise.
                      </p>
                    </div>
                  )
                )}
              </section>
            </div>
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
              startPeriod={startPeriod}
              endPeriod={endPeriod}
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
            <strong>Wind Resource Manager</strong> • Avaliação de Recurso Eólico no Brasil
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            Dados: ONS (Fator de Capacidade & Capacidade de Geração) • ECMWF ERA5 (0.25°) • NASA MERRA-2 (0.5°x0.625°)
          </p>
        </footer>
      </div>
    </div>
  );
};