import React from 'react';
import { BookOpen, Globe, Compass, Activity, CheckCircle2 } from 'lucide-react';

interface MethodologyViewProps {
  theme?: 'light' | 'dark';
}

export const MethodologyView: React.FC<MethodologyViewProps> = ({ theme = 'dark' }) => {
  const isLight = theme === 'light';

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className={`text-lg font-bold flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
          <BookOpen className="w-5 h-5 text-amber-500" />
          <span>Fundamentação Metodológica & Formulações</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400">
          Detalhamento matemático das malhas de reanálise, cálculo geodésico e extrapolação ao rotor
        </p>
      </div>

      {/* Grid Specs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`p-5 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'} space-y-2`}>
          <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-bold text-sm">
            <Globe className="w-4 h-4" />
            <span>Malha ERA5 (ECMWF)</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-zinc-300">
            O <strong>ERA5</strong> é a 5ª geração de reanálise atmosférica global do European Centre for Medium-Range Weather Forecasts (ECMWF).
          </p>
          <ul className="text-xs text-slate-500 dark:text-zinc-400 space-y-1 list-disc list-inside pt-1">
            <li>Resolução horizontal: <strong>0,25° x 0,25°</strong> (~28 km)</li>
            <li>Níveis verticais de vento: <strong>100m</strong> (hub eólico) e <strong>10m</strong> (superfície)</li>
            <li>Frequência temporal: Horária desde 1940 até os dias atuais</li>
            <li>Variáveis: Velocidade, direção, temperatura e pressão à superfície</li>
          </ul>
        </div>

        <div className={`p-5 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'} space-y-2`}>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
            <Compass className="w-4 h-4" />
            <span>Malha MERRA-2 (NASA GMAO)</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-zinc-300">
            O <strong>MERRA-2</strong> é a reanálise de satélite de longo prazo produzida pelo Global Modeling and Assimilation Office (GMAO) da NASA.
          </p>
          <ul className="text-xs text-slate-500 dark:text-zinc-400 space-y-1 list-disc list-inside pt-1">
            <li>Resolução horizontal: <strong>0,5° lat x 0,625° lon</strong> (~50 km)</li>
            <li>Níveis verticais de vento: <strong>50m</strong> e <strong>10m</strong></li>
            <li>Extrapolação ao rotor: Lei potencial de cisalhamento do vento de Hellmann</li>
            <li>Frequência temporal: Horária desde 1980</li>
          </ul>
        </div>
      </div>

      {/* Mathematical Formulas */}
      <div className={`p-6 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'} space-y-4 text-xs text-slate-600 dark:text-zinc-300`}>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-zinc-800 pb-2">
          Modelos Matemáticos Aplicados
        </h3>

        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-slate-800 dark:text-zinc-200">1. Distância Geodésica de Haversine</h4>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
              Calcula a menor distância sobre a superfície esférica da Terra (Raio R = 6.371 km) entre as coordenadas da SE Coletora e os nós das malhas:
            </p>
            <div className={`p-3 rounded-lg font-mono text-[11px] my-1.5 ${isLight ? 'bg-slate-100 text-slate-800' : 'bg-zinc-950 text-zinc-300'}`}>
              d = 2 * R * arcsin( sqrt( sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlon/2) ) )
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-800 dark:text-zinc-200">2. Interpolação por Inverso da Distância Ponderada (IDW)</h4>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
              Determina o peso relativo dos 4 nós circundantes em função da distância em relação à Subestação Coletora:
            </p>
            <div className={`p-3 rounded-lg font-mono text-[11px] my-1.5 ${isLight ? 'bg-slate-100 text-slate-800' : 'bg-zinc-950 text-zinc-300'}`}>
              wi = (1 / di²) / Σ (1 / dj²)
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-800 dark:text-zinc-200">3. Distribuição de Probabilidade de Weibull</h4>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
              Ajustada por Máxima Verossimilhança para caracterização do regime anemométrico histórico:
            </p>
            <div className={`p-3 rounded-lg font-mono text-[11px] my-1.5 ${isLight ? 'bg-slate-100 text-slate-800' : 'bg-zinc-950 text-zinc-300'}`}>
              f(v) = (k / c) * (v / c)^(k - 1) * exp( -(v / c)^k )
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              Onde <strong>k</strong> é o fator de forma adstringente e <strong>c</strong> é o fator de escala (velocidade característica em m/s).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};