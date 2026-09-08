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
  position: 'NW' | 'NE' | 'SW' | 'SE' | 'SYNTHETIC';
  latitude: number;
  longitude: number;
  distance_km: number;
  bearing_deg: number;
  cardinal_direction: string;
  weight: number;
  is_cached: boolean;
  is_interpolated?: boolean;
}

export interface BoundingNodeInfo {
  node_id: string;
  position: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  bearing_deg: number;
  weight: number;
}

export interface InterpolationRequest {
  model: 'ERA5' | 'MERRA-2';
  latitude: number;
  longitude: number;
  site_name?: string;
  start_year?: number;
  end_year?: number;
  force?: boolean;
}

export interface InterpolationResponse {
  status: string;
  model: string;
  synthetic_node_id: string;
  site_name: string;
  latitude: number;
  longitude: number;
  records_count: number;
  file_path: string;
  file_size_mb: number;
  cached: boolean;
  weights: Record<string, number>;
  bounding_nodes: BoundingNodeInfo[];
  message: string;
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
  start_year_month: string;
  end_year_month: string;
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
  speed_measured?: number | null;
  generation_mw?: number | null;
  invalid_wind_pct?: number;
  plant_speeds?: Record<string, number | null>;
}

export interface TimeSeriesResponse {
  node_id: string;
  model: string;
  aggregation: string;
  has_measured_data?: boolean;
  selected_plant?: string;
  available_plants?: string[];
  total_points: number;
  series: TimeSeriesItem[];
}

export interface EnsemblePlantsResponse {
  ensemble_name: string;
  id_ons?: string;
  plants: string[];
}

export interface CorrelationPoint {
  x: number;
  y: number;
}

export interface ScatterPoint {
  x: number;
  y: number;
  time: string;
}

export interface CorrelationResponse {
  node_id: string;
  model: string;
  ensemble_name: string;
  plant_name?: string;
  available_plants?: string[];
  n_samples: number;
  aggregation: 'hourly' | 'daily' | 'weekly' | 'monthly';
  pearson_r: number;
  r_squared: number;
  slope: number;
  intercept: number;
  equation: string;
  bias: number;
  rmse: number;
  mae: number;
  r_quality: string;
  r_color: string;
  reanalysis_mean: number;
  reanalysis_std: number;
  measured_mean: number;
  measured_std: number;
  fit_line: CorrelationPoint[];
  ideal_line: CorrelationPoint[];
  scatter_points: (ScatterPoint | [number, number, string])[];
}

export interface OnsMeasuredItem {
  time: string;
  speed_measured: number;
  generation_mw: number;
  invalid_flag_pct?: number;
  invalid_flag_count?: number;
  plant_speeds?: Record<string, number | null>;
}

export interface OnsMeasuredResponse {
  ensemble_name: string;
  id_ons?: string;
  target_plant?: string;
  available_plants?: string[];
  total_points: number;
  aggregation: string;
  series: OnsMeasuredItem[];
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

export interface PlantCorrelationMetric {
  plant_name: string;
  r: number | null;
  r_squared: number | null;
  rmse: number | null;
  bias: number | null;
  mae: number | null;
  n_samples: number;
  is_best: boolean;
}

export interface SeriesCorrelationRow {
  series_id: string;
  series_name: string;
  model: 'ERA5' | 'MERRA-2';
  series_type: 'node' | 'synthetic';
  position: string;
  cardinal_direction: string;
  distance_km: number;
  bearing_deg: number;
  latitude: number;
  longitude: number;
  weight: number;
  is_cached: boolean;
  global_score: number | null;
  wins_count: number;
  metrics_by_plant: Record<string, PlantCorrelationMetric>;
}

export interface ChampionInfo {
  series_id: string;
  series_name: string;
  model: string;
  series_type: string;
  global_score: number;
  ensemble_mean_r: number;
  wins_count: number;
  total_plants: number;
}

export interface CorrelationMatrixResponse {
  ensemble_name: string;
  id_ons?: string | null;
  aggregation: string;
  has_data: boolean;
  plants: string[];
  series: SeriesCorrelationRow[];
  best_per_plant: Record<string, string>;
  global_champion: ChampionInfo | null;
  message?: string | null;
}