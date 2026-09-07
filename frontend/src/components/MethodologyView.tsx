import React from 'react';
import {
  BookOpen,
  Globe,
  Compass,
  Layers,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

interface MethodologyViewProps {
  theme?: 'light' | 'dark';
}

export const MethodologyView: React.FC<MethodologyViewProps> = ({ theme = 'dark' }) => {
  const isLight = theme === 'light';

  return (
    <div className="space-y-8 max-w-5xl pb-12">
      {/* Header */}
      <div>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
          <BookOpen className="w-6 h-6 text-amber-500" />
          <span>Fundamentação Metodológica & Formulações Geocientíficas</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
          Rigor matemático, extrapolação espacial vetorial (Padrão Mundial Vortex FdC), formulações geodésicas e malhas de reanálise atmosférica
        </p>
      </div>

      {/* Grid Specs Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`p-5 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'} space-y-2.5 shadow-sm`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-bold text-sm">
              <Globe className="w-4 h-4" />
              <span>Malha ECMWF ERA5</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold border border-cyan-500/20">
              0,25° (~28 km)
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-zinc-300">
            5ª geração do Centro Europeu de Previsões Meteorológicas de Médio Prazo (ECMWF), amplamente adotada como referência primária para avaliação de recurso eólico offshore e onshore mundial.
          </p>
          <ul className="text-xs text-slate-500 dark:text-zinc-400 space-y-1 list-disc list-inside pt-1">
            <li>Resolução horizontal: <strong>0,25° x 0,25°</strong> (~28 km)</li>
            <li>Níveis verticais de vento: <strong>100m</strong> (hub eólico) e <strong>10m</strong> (superfície)</li>
            <li>Frequência temporal: Horária contínua desde 1940 até os dias atuais</li>
            <li>Variáveis: Velocidade horária, direção anemométrica, temperatura a 2m e pressão à superfície</li>
          </ul>
        </div>

        <div className={`p-5 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'} space-y-2.5 shadow-sm`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
              <Compass className="w-4 h-4" />
              <span>Malha NASA MERRA-2</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
              0,5° x 0,625° (~50 km)
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-zinc-300">
            Modern-Era Retrospective analysis for Research and Applications, versão 2, gerada pelo GMAO/NASA com integração contínua de radiância de satélite e aerossóis atmosféricos.
          </p>
          <ul className="text-xs text-slate-500 dark:text-zinc-400 space-y-1 list-disc list-inside pt-1">
            <li>Resolução horizontal: <strong>0,5° lat x 0,625° lon</strong> (~50 km)</li>
            <li>Níveis verticais de vento: <strong>50m</strong> e <strong>10m</strong></li>
            <li>Extrapolação ao rotor (100m): Lei de cisalhamento do vento de Hellmann</li>
            <li>Frequência temporal: Horária desde 1980</li>
          </ul>
        </div>
      </div>

      {/* SECTION: Extrapolação Espacial Vetorial Horizontal (Vortex FdC Standard) */}
      <div className={`p-6 rounded-2xl border ${
        isLight ? 'bg-gradient-to-b from-white to-cyan-50/20 border-cyan-200' : 'bg-gradient-to-b from-zinc-900 to-cyan-950/20 border-cyan-900/50'
      } space-y-5 shadow-sm`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-500/20 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 text-white shadow-md shadow-cyan-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Extrapolação Espacial Vetorial Horizontal
              </h3>
              <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">
                Metodologia
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0 self-start sm:self-auto">
            <ShieldCheck className="w-3.5 h-3.5" />
            Consistência Física Vetorial
          </span>
        </div>

        {/* The Physics Problem: Why Scalar Interpolation Fails */}
        <div className={`p-4 rounded-xl border ${
          isLight ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-amber-950/20 border-amber-800/40 text-amber-200'
        } space-y-2 text-xs`}>
          <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Por que a Interpolação Escalar Linear Clássica é Inadmissível no Vento?</span>
          </div>
          <p className="leading-relaxed">
            O vento é uma grandeza física <strong>vetorial bidimensional</strong> caracterizada por magnitude (velocidade S) e orientação espacial (azimute meteorológico θ). Fazer uma média ponderada linear simples das grandezas escalares (velocidade média e direção média escalares) gera violações graves das equações de conservação e anomalias físicas inaceitáveis:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] opacity-90">
            <li>
              <strong>Descontinuidade Angular de Fronteira:</strong> Se um nó vizinho registra vento de <strong>359°</strong> (Norte-Noroeste) e o nó adjacente registra <strong>1°</strong> (Norte-Nordeste), a interpolação escalar clássica produz (359° + 1°) / 2 = <strong>180°</strong> (vento exatamente de <strong>Sul</strong>), invertendo a direção real em 180°.
            </li>
            <li>
              <strong>Destruição da Conservação do Momento:</strong> Ventos opostos ou em cisalhamento horizontal que deveriam se anular vetorialmente mantêm energia artificial na interpolação escalar, inflando erroneamente a geração eólica calculada.
            </li>
          </ul>
        </div>

        {/* Step-by-Step Algorithm */}
        <div className="space-y-4 text-xs text-slate-600 dark:text-zinc-300">
          <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
            Passo a Passo Matemático da Reconstituição Vetorial Horária
          </h4>

          {/* Passo 1 */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-zinc-200">
              <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[10px] font-mono shrink-0">1</span>
              <span>Decomposição Ortogonal Horária em Componentes Cartesianas (u, v)</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 pl-7 leading-relaxed">
              Para cada hora t e para cada um dos 4 nós circundantes da grade (i = 1 a 4), a velocidade horária S a 100m e o ângulo de direção θ (convenção meteorológica: de onde o vento sopra) são convertidos nas componentes vetoriais zonal u (positiva para Leste) e meridional v (positiva para Norte):
            </p>
            <div className={`p-3 rounded-xl font-mono text-[11px] ml-7 my-1 ${isLight ? 'bg-slate-100 text-slate-800' : 'bg-zinc-950 text-cyan-300 border border-zinc-800'}`}>
              u_i(t) = -S_i(t) * sin( θ_i(t) * π / 180 )<br />
              v_i(t) = -S_i(t) * cos( θ_i(t) * π / 180 )
            </div>
          </div>

          {/* Passo 2 */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-zinc-200">
              <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[10px] font-mono shrink-0">2</span>
              <span>Ponderação pelo Inverso do Quadrado da Distância Geodésica (IDW Esférico, p = 2)</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 pl-7 leading-relaxed">
              A menor distância ortodrômica d_i entre o ponto alvo e cada nó i é calculada via Haversine sobre a esfera terrestre (Raio R = 6.371 km). Os pesos normalizados w_i obedecem à lei do inverso do quadrado da distância:
            </p>
            <div className={`p-3 rounded-xl font-mono text-[11px] ml-7 my-1 ${isLight ? 'bg-slate-100 text-slate-800' : 'bg-zinc-950 text-cyan-300 border border-zinc-800'}`}>
              d_i = Haversine( lat_alvo, lon_alvo, lat_i, lon_i )<br />
              w_i = ( 1 / d_i² ) / Σ_j ( 1 / d_j² ) &nbsp;&nbsp;[onde Σ_i w_i = 1,000]
            </div>
            <p className="text-[10px] text-slate-500 dark:text-zinc-500 pl-7 italic">
              * Tratamento de singularidade: se o ponto alvo coincidir com o nó (d_i &lt; 1 metro), atribui-se peso w_i = 1,0 e w_j = 0,0.
            </p>
          </div>

          {/* Passo 3 */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-zinc-200">
              <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[10px] font-mono shrink-0">3</span>
              <span>Interpolação Espacial Independente dos Campos Vetoriais</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 pl-7 leading-relaxed">
              As componentes cartesianas interpoladas no ponto exato de interesse são sintetizadas linearmente de forma independente para cada hora da série histórica:
            </p>
            <div className={`p-3 rounded-xl font-mono text-[11px] ml-7 my-1 ${isLight ? 'bg-slate-100 text-slate-800' : 'bg-zinc-950 text-cyan-300 border border-zinc-800'}`}>
              u_alvo(t) = Σ ( w_i * u_i(t) )<br />
              v_alvo(t) = Σ ( w_i * v_i(t) )
            </div>
          </div>

          {/* Passo 4 */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-zinc-200">
              <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[10px] font-mono shrink-0">4</span>
              <span>Reconstituição Física Angular e Escalar da Série Resultante</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 pl-7 leading-relaxed">
              A velocidade escalar final S_alvo(t) e o azimute meteorológico real θ_alvo(t) são recuperados através da norma euclidiana e da função arco-tangente de dois argumentos atan2(-u, -v):
            </p>
            <div className={`p-3 rounded-xl font-mono text-[11px] ml-7 my-1 ${isLight ? 'bg-slate-100 text-slate-800' : 'bg-zinc-950 text-cyan-300 border border-zinc-800'}`}>
              S_alvo(t) = sqrt( u_alvo(t)² + v_alvo(t)² )<br />
              θ_alvo(t) = [ atan2( -u_alvo(t), -v_alvo(t) ) * (180 / π) + 360 ] mod 360
            </div>
          </div>

          {/* Passo 5 */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-zinc-200">
              <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[10px] font-mono shrink-0">5</span>
              <span>Interpolação de Grandezas Termodinâmicas e Cisalhamento Vertical</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 pl-7 leading-relaxed">
              Grandezas escalares de estado atmosférico são interpoladas pelos pesos geodésicos $w_i$. O cisalhamento vertical (expoente $\alpha$ da lei potencial de Hellmann) é calculado diretamente a partir dos níveis de 100m e 10m já interpolados:
            </p>
            <div className={`p-3 rounded-xl font-mono text-[11px] ml-7 my-1 ${isLight ? 'bg-slate-100 text-slate-800' : 'bg-zinc-950 text-cyan-300 border border-zinc-800'}`}>
              T_2m(t) &nbsp;&nbsp;= Σ ( w_i * T_2m_i(t) )<br />
              P_sfc(t) = Σ ( w_i * P_sfc_i(t) )<br />
              α(t) &nbsp;&nbsp;&nbsp;&nbsp;= ln( S_100m(t) / S_10m(t) ) / ln( 100 / 10 )
            </div>
          </div>
        </div>
      </div>

      {/* Classic Mathematical Formulations */}
      <div className={`p-6 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'} space-y-5 text-xs text-slate-600 dark:text-zinc-300 shadow-sm`}>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-zinc-800 pb-2">
          Modelos Estatísticos & Anemométricos Clássicos
        </h3>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-slate-800 dark:text-zinc-200">1. Distância Geodésica de Haversine</h4>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
              Calcula o arco de grande círculo sobre a superfície esférica da Terra (Raio R = 6.371 km):
            </p>
            <div className={`p-3 rounded-xl font-mono text-[11px] my-1.5 ${isLight ? 'bg-slate-100 text-slate-800' : 'bg-zinc-950 text-zinc-300'}`}>
              d = 2 * R * arcsin( sqrt( sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlon/2) ) )
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-800 dark:text-zinc-200">2. Distribuição de Probabilidade de Weibull</h4>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
              Ajustada por Estimativa de Máxima Verossimilhança (MLE) para caracterização do regime de vento histórico:
            </p>
            <div className={`p-3 rounded-xl font-mono text-[11px] my-1.5 ${isLight ? 'bg-slate-100 text-slate-800' : 'bg-zinc-950 text-zinc-300'}`}>
              f(v) = (k / c) * (v / c)^(k - 1) * exp( -(v / c)^k )
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              Onde <strong>k</strong> é o parâmetro de forma (adimensional) e <strong>c</strong> é o parâmetro de escala (m/s).
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-800 dark:text-zinc-200">3. Correlação Linear de Pearson & MCP (Measure-Correlate-Predict)</h4>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
              Quantifica o grau de acoplamento linear entre o vento concomitante da reanálise e a velocidade real medida nos anemômetros dos aerogeradores:
            </p>
            <div className={`p-3 rounded-xl font-mono text-[11px] my-1.5 ${isLight ? 'bg-slate-100 text-slate-800' : 'bg-zinc-950 text-zinc-300'}`}>
              r = Σ [ (x_i - x̄) * (y_i - ȳ) ] / [ sqrt( Σ (x_i - x̄)² ) * sqrt( Σ (y_i - ȳ)² ) ]<br />
              y = a * x + b &nbsp;&nbsp;[Regressão Linear dos Mínimos Quadrados Ordinários - OLS]
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};