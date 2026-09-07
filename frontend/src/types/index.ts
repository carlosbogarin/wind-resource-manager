export interface CompanySummary {
  company_name: string;
  total_ensembles: number;
  total_mw: number;
  states: string[];
}

export interface FCHistoryItem {
  mes_ano: string;
  fc: number;
  cap_mw: number;
}

export interface Ensemble {
  ensemble_name: string;
  id_ons: string;
  subsystem: string;
  subsystem_name: string;
  state: string;
  state_name: string;
  connection_point: string;
  latitude: number;
  longitude: number;
  capacity_mw: number;
  plant_count: number;
  plants: string;
}

export interface EnsembleDetail extends Ensemble {
  company_name: string;
  fc_history: FCHistoryItem[];
}

export interface ReanalysisNode {
  node_id: string;
  model: 'ERA5' | 'MERRA-2';
  position: 'NW' | 'NE' | 'SW' | 'SE';
  latitude: number;
  longitude: number;
  distance_km: number;
  bearing_deg: number;
  cardinal_direction: string;
  weight: number;
  is_cached: boolean;
}

export interface SubstationGeo {
  id_ons: string;
  ensemble_name: string;
  latitude: number;
  longitude: number;
  state: string;
  capacity_mw: number;
}

export interface NodesResponse {
  substation: SubstationGeo;
  era5_nodes: ReanalysisNode[];
  merra2_nodes: ReanalysisNode[];
}

export interface DateRangeInfo {
  era5_latest_date: string;
  merra2_latest_date: string;
  common_end_date: string;
  common_start_date: string;
  start_year: number;
  end_year: number;
  total_years: number;
  limiting_model: string;
  explanation: string;
}

export interface DownloadResponse {
  status: string;
  node_id: string;
  model: string;
  records_count: number;
  file_size_mb: number;
  cached: boolean;
  message: string;
}

export interface TimeSeriesItem {
  time: string;
  speed_100m: number;
  speed_10m: number;
  speed_max?: number;
  temp?: number;
  direction_100m?: number;
}

export interface TimeSeriesResponse {
  node_id: string;
  model: string;
  aggregation: string;
  total_points: number;
  series: TimeSeriesItem[];
}

export interface WeibullHistogramItem {
  speed_bin: string;
  speed_center: number;
  frequency_pct: number;
}

export interface WeibullCurveItem {
  speed: number;
  probability_pct: number;
}

export interface WeibullData {
  k_shape: number;
  c_scale: number;
  mean_speed: number;
  std_speed: number;
  histogram: WeibullHistogramItem[];
  weibull_curve: WeibullCurveItem[];
}

export interface WindRoseSeriesItem {
  name: string;
  color: string;
  data: number[];
}

export interface WindRoseData {
  sectors: string[];
  speed_bins: string[];
  series: WindRoseSeriesItem[];
  dominant_sector: string;
  dominant_frequency_pct: number;
  calm_percentage: number;
}

export interface DiurnalProfileItem {
  hour: number;
  hour_label: string;
  mean_speed: number;
  p10_speed: number;
  p90_speed: number;
  std_speed: number;
}

export interface MonthlySeasonalityItem {
  month: number;
  month_name: string;
  mean_speed: number;
  min_speed: number;
  max_speed: number;
  std_speed: number;
}

export interface ONSCorrelationItem {
  mes_ano: string;
  ons_fc_pct: number;
  capacity_mw: number;
  reanalysis_wind_speed: number | null;
}

export interface AnalyticsData {
  node_id: string;
  model: string;
  total_hours: number;
  period_start: string;
  period_end: string;
  weibull: WeibullData;
  wind_rose: WindRoseData;
  diurnal_profile: DiurnalProfileItem[];
  monthly_seasonality: MonthlySeasonalityItem[];
  ons_correlation: ONSCorrelationItem[];
}