import axios from 'axios';
import {
  CompanySummary,
  Ensemble,
  EnsembleDetail,
  NodesResponse,
  DateRangeInfo,
  DownloadResponse,
  TimeSeriesResponse,
  AnalyticsData,
  CorrelationResponse,
  OnsMeasuredResponse,
  EnsemblePlantsResponse,
  InterpolationRequest,
  InterpolationResponse,
  CorrelationMatrixResponse,
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

export const fetchEnsembleDetails = async (id_ons: string): Promise<EnsembleDetail> => {
  const { data } = await api.get<EnsembleDetail>(`/catalog/ensemble/${id_ons}`);
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
}

export const fetchCorrelationMatrix = async (
  params: CorrelationMatrixParams
): Promise<CorrelationMatrixResponse> => {
  const { data } = await api.get<CorrelationMatrixResponse>('/reanalysis/correlation-matrix', {
    params,
  });
  return data;
};


export interface OnsMeasuredParams {
  ensemble_name: string;
  id_ons?: string;
  plant_name?: string;
  start_month?: string;
  end_month?: string;
  aggregation?: 'hourly' | 'daily' | 'monthly';
}

export const fetchOnsMeasured = async (params: OnsMeasuredParams): Promise<OnsMeasuredResponse> => {
  const { data } = await api.get<OnsMeasuredResponse>('/reanalysis/ons-measured', {
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