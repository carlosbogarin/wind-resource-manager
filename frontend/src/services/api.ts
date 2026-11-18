import axios from 'axios';
import {
  CompanySummary,
  Ensemble,
  NodesResponse,
  DateRangeInfo,
  DownloadResponse,
  TimeSeriesResponse,
  AnalyticsData,
  CorrelationResponse,
  EnsemblePlantsResponse,
  InterpolationRequest,
  InterpolationResponse,
  CorrelationMatrixResponse,
  MetMastDatasetItem,
  MetMastLoadedDataset,
  MetMastTimeseriesResponse,
  MetMastQCResult,
  MetMastWindRoseData,
  MetMastWindShearData,
  MetMastTurbulenceData,
  MetMast12x24Data,
  MetMastWeibullData,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 300000, // 5 minutos padrão
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchCompanies = async (): Promise<CompanySummary[]> => {
  const { data } = await api.get<CompanySummary[]>('/catalog/companies');
  return data;
};

export const fetchEnsembles = async (company: string): Promise<Ensemble[]> => {
  const { data } = await api.get<Ensemble[]>('/catalog/ensembles', {
    params: { company },
  });
  return data;
};

export const fetchEnsemblePlants = async (ensemble_name: string, id_ons?: string): Promise<string[]> => {
  const { data } = await api.get<EnsemblePlantsResponse>('/reanalysis/plants', {
    params: { ensemble_name, id_ons },
  });
  return data.plants || ['Média do Conjunto'];
};

export const fetchNodes = async (id_ons: string): Promise<NodesResponse> => {
  const { data } = await api.get<NodesResponse>('/reanalysis/nodes', {
    params: { id_ons },
  });
  return data;
};

export const fetchNodesByCoordinates = async (
  latitude: number,
  longitude: number,
  site_name: string = 'Ponto Personalizado'
): Promise<NodesResponse> => {
  const { data } = await api.get<NodesResponse>('/reanalysis/nodes-by-coords', {
    params: { latitude, longitude, site_name },
  });
  return data;
};

export const runSpatialInterpolation = async (
  params: InterpolationRequest
): Promise<InterpolationResponse> => {
  const { data } = await api.post<InterpolationResponse>('/reanalysis/interpolate', params, {
    timeout: 600000, // 10 minutos para download e interpolação horizontal de 4 nós
  });
  return data;
};

export const fetchDateRange = async (): Promise<DateRangeInfo> => {
  const { data } = await api.get<DateRangeInfo>('/reanalysis/date-range');
  return data;
};

export interface DownloadParams {
  node_id: string;
  model: 'ERA5' | 'MERRA-2';
  latitude: number;
  longitude: number;
  start_year: number;
  end_year: number;
  start_month?: string;
  end_month?: string;
  force?: boolean;
}

export const downloadNodeData = async (params: DownloadParams): Promise<DownloadResponse> => {
  const { data } = await api.post<DownloadResponse>('/reanalysis/download', params, {
    timeout: 300000, // 5 minutos para download de nó individual
  });
  return data;
};

export interface TimeSeriesParams {
  node_id: string;
  model: string;
  latitude: number;
  longitude: number;
  ensemble_name?: string;
  plant_name?: string;
  start_year?: number;
  end_year?: number;
  start_month?: string;
  end_month?: string;
  aggregation?: 'hourly' | 'daily' | 'monthly';
}

export const fetchTimeSeries = async (params: TimeSeriesParams): Promise<TimeSeriesResponse> => {
  const { data } = await api.get<TimeSeriesResponse>('/reanalysis/timeseries', {
    params,
  });
  return data;
};

export interface CorrelationParams {
  node_id: string;
  model: string;
  latitude: number;
  longitude: number;
  ensemble_name: string;
  id_ons?: string;
  plant_name?: string;
  start_year?: number;
  end_year?: number;
  start_month?: string;
  end_month?: string;
  aggregation?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  algorithm?: 'LLS' | 'TLS';
}

export const fetchCorrelation = async (params: CorrelationParams): Promise<CorrelationResponse | null> => {
  const { data } = await api.get<CorrelationResponse | null>('/reanalysis/correlation', {
    params,
  });
  return data;
};

export interface CorrelationMatrixParams {
  ensemble_name: string;
  latitude: number;
  longitude: number;
  id_ons?: string;
  start_year?: number;
  end_year?: number;
  start_month?: string;
  end_month?: string;
  aggregation?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  algorithm?: 'LLS' | 'TLS';
}

export const fetchCorrelationMatrix = async (
  params: CorrelationMatrixParams
): Promise<CorrelationMatrixResponse> => {
  const { data } = await api.get<CorrelationMatrixResponse>('/reanalysis/correlation-matrix', {
    params,
  });
  return data;
};

export interface AnalyticsParams {
  node_id: string;
  model: string;
  latitude: number;
  longitude: number;
  id_ons?: string;
  start_year?: number;
  end_year?: number;
  start_month?: string;
  end_month?: string;
}

export const fetchAnalytics = async (params: AnalyticsParams): Promise<AnalyticsData> => {
  const { data } = await api.get<AnalyticsData>('/reanalysis/analytics', {
    params,
  });
  return data;
};

export const getExportCsvUrl = (params: TimeSeriesParams): string => {
  const query = new URLSearchParams({
    node_id: params.node_id,
    model: params.model,
    latitude: params.latitude.toString(),
    longitude: params.longitude.toString(),
    start_year: (params.start_year || 1996).toString(),
    end_year: (params.end_year || 2026).toString(),
  });
  if (params.start_month) query.set('start_month', params.start_month);
  if (params.end_month) query.set('end_month', params.end_month);
  return `${API_BASE}/api/export/csv?${query.toString()}`;
};

export const getExportParquetUrl = (params: TimeSeriesParams): string => {
  const query = new URLSearchParams({
    node_id: params.node_id,
    model: params.model,
    latitude: params.latitude.toString(),
    longitude: params.longitude.toString(),
    start_year: (params.start_year || 1996).toString(),
    end_year: (params.end_year || 2026).toString(),
  });
  return `${API_BASE}/api/export/parquet?${query.toString()}`;
};

// =====================================================================
// Torres Anemométricas & LiDAR (Met Mast Studio)
// =====================================================================

const MET_MAST_SESSION_KEY = 'wrm_metmast_session_id';

const getMetMastSessionId = (): string => {
  if (typeof window === 'undefined') return 'default';
  let sid = sessionStorage.getItem(MET_MAST_SESSION_KEY);
  if (!sid) {
    sid =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `mm_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
        : `mm_${Math.random().toString(36).slice(2, 14)}`;
    sessionStorage.setItem(MET_MAST_SESSION_KEY, sid);
  }
  return sid;
};

const metMastHeaders = () => ({
  'X-MetMast-Session': getMetMastSessionId(),
});

export const fetchMetMastDatasets = async (): Promise<MetMastDatasetItem[]> => {
  const { data } = await api.get<MetMastDatasetItem[]>('/met-mast/datasets', {
    headers: metMastHeaders(),
  });
  return data;
};

export const loadMetMastDataset = async (datasetId: string): Promise<MetMastLoadedDataset> => {
  const { data } = await api.post<MetMastLoadedDataset>(
    '/met-mast/datasets/load',
    { dataset_id: datasetId, session_id: getMetMastSessionId() },
    { headers: metMastHeaders() }
  );
  return data;
};

export const uploadMetMastDataset = async (
  file: File
): Promise<{ status: string; dataset_id: string; filename: string; size_bytes: number }> => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/met-mast/datasets/upload', formData, {
    headers: {
      ...metMastHeaders(),
      'Content-Type': 'multipart/form-data',
    },
    timeout: 120000,
  });
  return data;
};

export const fetchMetMastTimeseries = async (
  columns: string[],
  maxPoints: number = 1500,
  startDate?: string,
  endDate?: string,
  datasetId?: string
): Promise<MetMastTimeseriesResponse> => {
  const { data } = await api.get<MetMastTimeseriesResponse>('/met-mast/timeseries', {
    params: {
      columns: columns.join(','),
      max_points: maxPoints,
      start_date: startDate,
      end_date: endDate,
      dataset_id: datasetId,
      session_id: getMetMastSessionId(),
    },
    headers: metMastHeaders(),
  });
  return data;
};

export interface MetMastQCRulesPayload {
  speed_col: string;
  min_speed?: number;
  max_speed?: number;
  direction_col?: string;
  shadow_sector_start?: number;
  shadow_sector_end?: number;
  temp_col?: string;
  min_temp_icing?: number;
  std_col?: string;
  min_std_frozen?: number;
  dataset_id?: string;
}

export const applyMetMastQCRules = async (rules: MetMastQCRulesPayload): Promise<MetMastQCResult> => {
  const { data } = await api.post<MetMastQCResult>(
    '/met-mast/qc/apply',
    { ...rules, session_id: getMetMastSessionId() },
    { headers: metMastHeaders() }
  );
  return data;
};

export const resetMetMastQCRules = async (datasetId?: string): Promise<MetMastQCResult> => {
  const { data } = await api.post<MetMastQCResult>(
    '/met-mast/qc/reset',
    null,
    {
      params: { dataset_id: datasetId, session_id: getMetMastSessionId() },
      headers: metMastHeaders(),
    }
  );
  return data;
};

export const fetchMetMastWindRose = async (
  speedCol: string,
  dirCol: string,
  sectors: number = 16,
  applyQC: boolean = true,
  datasetId?: string
): Promise<MetMastWindRoseData> => {
  const { data } = await api.get<MetMastWindRoseData>('/met-mast/analysis/wind-rose', {
    params: {
      speed_col: speedCol,
      direction_col: dirCol,
      sectors,
      apply_qc: applyQC,
      dataset_id: datasetId,
      session_id: getMetMastSessionId(),
    },
    headers: metMastHeaders(),
  });
  return data;
};

export const fetchMetMastWindShear = async (
  anemometers: { column: string; height: number }[],
  hubHeights: number[] = [100, 120, 140, 160],
  minSpeed: number = 3.0,
  applyQC: boolean = true,
  datasetId?: string
): Promise<MetMastWindShearData> => {
  const { data } = await api.post<MetMastWindShearData>(
    '/met-mast/analysis/wind-shear',
    {
      anemometers,
      hub_heights: hubHeights,
      min_speed: minSpeed,
      apply_qc: applyQC,
      dataset_id: datasetId,
      session_id: getMetMastSessionId(),
    },
    { headers: metMastHeaders() }
  );
  return data;
};

export const fetchMetMastTurbulence = async (
  speedCol: string,
  stdCol: string,
  minSpeed: number = 3.0,
  applyQC: boolean = true,
  datasetId?: string
): Promise<MetMastTurbulenceData> => {
  const { data } = await api.get<MetMastTurbulenceData>('/met-mast/analysis/turbulence', {
    params: {
      speed_col: speedCol,
      std_col: stdCol,
      min_speed: minSpeed,
      apply_qc: applyQC,
      dataset_id: datasetId,
      session_id: getMetMastSessionId(),
    },
    headers: metMastHeaders(),
  });
  return data;
};

export const fetchMetMast12x24 = async (
  speedCol: string,
  applyQC: boolean = true,
  datasetId?: string
): Promise<MetMast12x24Data> => {
  const { data } = await api.get<MetMast12x24Data>('/met-mast/analysis/12x24', {
    params: {
      speed_col: speedCol,
      apply_qc: applyQC,
      dataset_id: datasetId,
      session_id: getMetMastSessionId(),
    },
    headers: metMastHeaders(),
  });
  return data;
};

export const fetchMetMastWeibull = async (
  speedCol: string,
  applyQC: boolean = true,
  datasetId?: string
): Promise<MetMastWeibullData> => {
  const { data } = await api.get<MetMastWeibullData>('/met-mast/analysis/weibull', {
    params: {
      speed_col: speedCol,
      apply_qc: applyQC,
      dataset_id: datasetId,
      session_id: getMetMastSessionId(),
    },
    headers: metMastHeaders(),
  });
  return data;
};

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
};

export const downloadMetMastWaspTab = async (
  speedCol: string,
  dirCol: string,
  height: number,
  mastName: string = 'Torre_Eolica_01',
  lat: number = -5.0,
  lon: number = -38.0,
  applyQC: boolean = true,
  datasetId?: string
): Promise<void> => {
  const response = await api.post(
    '/met-mast/export/wasp-tab',
    {
      speed_col: speedCol,
      direction_col: dirCol,
      height,
      mast_name: mastName,
      lat,
      lon,
      apply_qc: applyQC,
      dataset_id: datasetId,
      session_id: getMetMastSessionId(),
    },
    {
      headers: metMastHeaders(),
      responseType: 'blob',
    }
  );
  triggerBlobDownload(new Blob([response.data], { type: 'text/plain;charset=utf-8' }), `${mastName}_${Math.round(height)}m.tab`);
};

export const downloadMetMastCleanCsv = async (
  applyQC: boolean = true,
  datasetId?: string
): Promise<void> => {
  const response = await api.get('/met-mast/export/clean-csv', {
    params: {
      apply_qc: applyQC,
      dataset_id: datasetId,
      session_id: getMetMastSessionId(),
    },
    headers: metMastHeaders(),
    responseType: 'blob',
  });
  const baseName = (datasetId || 'torre_anemometrica').replace(/^upload_/, '').replace(/\.[^.]+$/, '');
  const filename = `${baseName}_${applyQC ? 'limpo_qc' : 'completo'}.csv`;
  triggerBlobDownload(new Blob([response.data], { type: 'text/csv;charset=utf-8' }), filename);
};