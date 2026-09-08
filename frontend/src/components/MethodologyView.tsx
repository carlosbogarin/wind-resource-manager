import React from 'react';
import {
  BookOpen,
  Globe,
  Compass,
  Layers,
  ShieldCheck,
  AlertTriangle,
  GitCompare,
  TrendingUp,
  CheckCircle2,
  Table,
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
          Rigor matemático, extrapolação espacial vetorial (Shepard, 1968 / WMO No. 8), formulações geodésicas e malhas de reanálise atmosférica
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

      {/* SECTION: Metodologia MCP & Algoritmos de Correlação de Velocidade de Vento */}
      <div className={`p-6 rounded-2xl border ${
        isLight ? 'bg-gradient-to-b from-white to-emerald-50/20 border-emerald-200' : 'bg-gradient-to-b from-zinc-900 to-emerald-950/20 border-emerald-900/50'
      } space-y-5 shadow-sm`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/20 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-500 text-white shadow-md shadow-emerald-500/20">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Metodologia Measure-Correlate-Predict (MCP) & Algoritmos de Longo Prazo
              </h3>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                Padrão Internacional da Indústria Eólica (IEC 61400-12-1 / MEASNET / NREL / Rogers et al., 2005)
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0 self-start sm:self-auto font-mono">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Algoritmos no WRM: LLS & TLS
          </span>
        </div>

        {/* Overview of MCP */}
        <div className="text-xs text-slate-600 dark:text-zinc-300 space-y-2 leading-relaxed">
          <p>
            O método <strong>Measure-Correlate-Predict (MCP)</strong> é a metodologia padrão da indústria de energia eólica para mitigar o risco de variabilidade interanual do recurso eólico. Consiste em correlacionar dados de medição anemométrica no sítio alvo (<em>Target</em> — mastros anemométricos ou turbinas em operação) com uma série temporal contínua de longa duração (<em>Reference</em> — reanálises atmosféricas como ERA5 ou MERRA-2) durante o período concomitante. A partir dessa relação empírica, o regime do vento no sítio é reconstruído retroativamente para 20 a 30+ anos, permitindo o cálculo confiável das estimativas de energia P50 e P90 para financiamento e bancabilidade.
          </p>
        </div>

        {/* Algorithms in Wind Resource Manager */}
        <div className={`p-4 rounded-xl border ${
          isLight ? 'bg-cyan-50/70 border-cyan-200 text-cyan-950' : 'bg-cyan-950/20 border-cyan-800/40 text-cyan-200'
        } space-y-3 text-xs`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-cyan-700 dark:text-cyan-300 text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>Algoritmos no Wind Resource Manager (WRM): Escolha entre LLS e TLS</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-500/30">
              Controle do Usuário
            </span>
          </div>
          <p className="leading-relaxed">
            No <strong>WRM (Wind Resource Manager)</strong>, é disponibilizada ao usuário a possibilidade de escolha direta entre os dois algoritmos lineares mais consolidados na literatura científica e na engenharia eólica internacional: <strong>Linear Least Squares (LLS)</strong> e <strong>Total Least Squares (TLS - Regressão Ortogonal / Deming)</strong>. Ambas as formulações recalculam dinamicamente a matriz comparativa de ranking de nós/extrapolações e as retas de correlação nos gráficos MCP.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {/* LLS */}
            <div className={`p-3.5 rounded-xl border space-y-2 ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-zinc-950 border-zinc-800 text-zinc-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                  1. Linear Least Squares (LLS)
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20 font-mono">
                  Gauss-Markov BLUE
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                Minimiza a soma dos quadrados dos <strong>resíduos verticais</strong> na variável dependente (medição anemométrica no parque $y_i$). Assume que a incerteza estatística concentra-se predominantemente no sítio alvo, tratando a reanálise como preditor $x_i$ de referência.
              </p>
              <div className={`p-2.5 rounded-lg font-mono text-[10px] space-y-1 ${
                isLight ? 'bg-slate-50 text-slate-800' : 'bg-zinc-900 text-cyan-300'
              }`}>
                <div><strong>Função Objetivo:</strong> min Σ [y_i - (a·x_i + b)]²</div>
                <div><strong>Inclinação (Slope):</strong> a = r · (s_y / s_x) = Σ[(x - x̄)(y - ȳ)] / Σ[(x - x̄)²]</div>
                <div><strong>Intercepto:</strong> b = ȳ - a · x̄</div>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 italic">
                *Propriedade:* Estimador linear não viesado ótimo (Gauss-Markov). A variância prevista é s_pred = r · s_y (Derrick, 1992; Rogers et al., 2005).
              </p>
            </div>

            {/* TLS */}
            <div className={`p-3.5 rounded-xl border space-y-2 ${
              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-zinc-950 border-zinc-800 text-zinc-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-600 dark:text-cyan-400 font-mono text-xs">
                  2. Total Least Squares (TLS / Ortogonal)
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold border border-cyan-500/20 font-mono">
                  Deming / ODR
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                Minimiza a soma dos quadrados das <strong>distâncias ortogonais perpendiculares euclidianas</strong> de cada ponto $(x_i, y_i)$ até a reta ajustada. Ideal quando tanto a reanálise ($x$) quanto o anemômetro do parque ($y$) contêm erros estocásticos de magnitudes comparáveis (Deming, 1943; Golub & Van Loan, 1980).
              </p>
              <div className={`p-2.5 rounded-lg font-mono text-[10px] space-y-1 ${
                isLight ? 'bg-slate-50 text-slate-800' : 'bg-zinc-900 text-cyan-300'
              }`}>
                <div><strong>Função Objetivo:</strong> min Σ d_perp² = Σ [y_i - a·x_i - b]² / (1 + a²)</div>
                <div><strong>Inclinação Analítica:</strong> a = [ (s_yy - s_xx) + √((s_yy - s_xx)² + 4·s_xy²) ] / (2·s_xy)</div>
                <div><strong>Intercepto:</strong> b = ȳ - a · x̄</div>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 italic">
                *Propriedade:* Trata simetricamente ambas as variáveis, prevenindo compressão artificial da cauda de ventos altos (Rogers et al., 2005).
              </p>
            </div>
          </div>
        </div>

        {/* 8 Algorithms Catalog from Literature */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-zinc-100 text-xs">
            <Table className="w-4 h-4 text-emerald-500" />
            <span>Catálogo e Comparativo Teórico dos 8 Métodos de Correlação de Vento (Literatura Científica & Padrões Normativos)</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-zinc-800">
            <table className="w-full text-left text-[11px] border-collapse min-w-[700px]">
              <thead>
                <tr className={`border-b font-bold uppercase tracking-wider ${
                  isLight ? 'bg-slate-50 text-slate-700 border-slate-200' : 'bg-zinc-950 text-zinc-300 border-zinc-800'
                }`}>
                  <th className="py-2.5 px-3">Algoritmo</th>
                  <th className="py-2.5 px-2 text-center">Sigla</th>
                  <th className="py-2.5 px-3">Princípio Físico / Matemático</th>
                  <th className="py-2.5 px-2 text-center">Preserva Variância?</th>
                  <th className="py-2.5 px-3">Indicação & Comportamento</th>
                  <th className="py-2.5 px-2 text-center">WRM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                <tr className={isLight ? 'bg-emerald-50/40 font-medium' : 'bg-emerald-950/20 font-medium'}>
                  <td className="py-2 px-3 font-semibold text-emerald-700 dark:text-emerald-300">
                    Linear Least Squares
                  </td>
                  <td className="py-2 px-2 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">LLS</td>
                  <td className="py-2 px-3 font-mono text-[10px]">min Σ [y_i - (a·x_i + b)]²</td>
                  <td className="py-2 px-2 text-center text-amber-600 dark:text-amber-400 font-semibold">Parcial (r · s_y)</td>
                  <td className="py-2 px-3 text-slate-600 dark:text-zinc-300">
                    Padrão clássico da indústria. Minimização estrita dos resíduos na variável dependente (medição no parque). Robusto contra outliers na referência.
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500 text-white font-bold">Disponível</span>
                  </td>
                </tr>

                <tr className={isLight ? 'bg-cyan-50/30 font-medium' : 'bg-cyan-950/20 font-medium'}>
                  <td className="py-2 px-3 font-semibold text-cyan-700 dark:text-cyan-300">
                    Total Least Squares
                  </td>
                  <td className="py-2 px-2 text-center font-mono font-bold text-cyan-600 dark:text-cyan-400">TLS</td>
                  <td className="py-2 px-3 font-mono text-[10px]">min Σ d_perp² = [y - ax - b]² / (1+a²)</td>
                  <td className="py-2 px-2 text-center text-amber-600 dark:text-amber-400 font-semibold">Intermediário</td>
                  <td className="py-2 px-3 text-slate-600 dark:text-zinc-300">
                    Regressão Ortogonal (Deming / OLS Bisector). Minimiza distâncias perpendiculares euclidianas. Ideal quando referência e alvo possuem incertezas gaussianas de magnitude comparável.
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-600 text-white font-bold">Disponível</span>
                  </td>
                </tr>

                <tr>
                  <td className="py-2 px-3 font-semibold text-slate-800 dark:text-zinc-200">
                    Variance Ratio
                  </td>
                  <td className="py-2 px-2 text-center font-mono font-bold text-purple-600 dark:text-purple-400">VR</td>
                  <td className="py-2 px-3 font-mono text-[10px]">a = s_y / s_x ; b = ȳ - a·x̄</td>
                  <td className="py-2 px-2 text-center text-emerald-600 dark:text-emerald-400 font-bold">Sim (100%)</td>
                  <td className="py-2 px-3 text-slate-600 dark:text-zinc-300">
                    Força rigorosamente que a inclinação seja a razão dos desvios padrão (Curvers & Hermsen, 2002). Elimina o amortecimento de variância do LLS, preservando a cauda da distribuição.
                  </td>
                  <td className="py-2 px-2 text-center text-slate-400 text-[10px]">—</td>
                </tr>

                <tr>
                  <td className="py-2 px-3 font-semibold text-slate-800 dark:text-zinc-200">
                    Bulk Speed Ratio
                  </td>
                  <td className="py-2 px-2 text-center font-mono font-bold text-zinc-500">BSR</td>
                  <td className="py-2 px-3 font-mono text-[10px]">y = (ȳ / x̄) · x &nbsp;[b = 0]</td>
                  <td className="py-2 px-2 text-center text-rose-500 font-semibold">Não</td>
                  <td className="py-2 px-3 text-slate-600 dark:text-zinc-300">
                    Fator de escala proporcional simples baseado apenas na média global dos ventos. Útil apenas como triagem preliminar grosseira de primeira ordem.
                  </td>
                  <td className="py-2 px-2 text-center text-slate-400 text-[10px]">—</td>
                </tr>

                <tr>
                  <td className="py-2 px-3 font-semibold text-slate-800 dark:text-zinc-200">
                    Weibull Fit
                  </td>
                  <td className="py-2 px-2 text-center font-mono font-bold text-amber-600 dark:text-amber-400">WBL</td>
                  <td className="py-2 px-3 font-mono text-[10px]">y = a · x^b ; b = k_x / k_y ; a = c_y / c_x^b</td>
                  <td className="py-2 px-2 text-center text-cyan-600 dark:text-cyan-400 font-semibold">Via Weibull</td>
                  <td className="py-2 px-3 text-slate-600 dark:text-zinc-300">
                    Ajuste por lei potencial derivado analiticamente da equivalência das funções de densidade acumulada de Weibull entre o sítio e a reanálise (Carta et al., 2013).
                  </td>
                  <td className="py-2 px-2 text-center text-slate-400 text-[10px]">—</td>
                </tr>

                <tr>
                  <td className="py-2 px-3 font-semibold text-slate-800 dark:text-zinc-200">
                    SpeedSort (Ordenação Quantílica)
                  </td>
                  <td className="py-2 px-2 text-center font-mono font-bold text-blue-600 dark:text-blue-400">SS</td>
                  <td className="py-2 px-3 font-mono text-[10px]">Ordenação x_(i), y_(i) + regressão com "dog leg"</td>
                  <td className="py-2 px-2 text-center text-emerald-600 dark:text-emerald-400 font-bold">Sim (Quantil)</td>
                  <td className="py-2 px-3 text-slate-600 dark:text-zinc-300">
                    Algoritmo proposto por King & Hurley (2005). Ordena independentemente as velocidades de vento antes de correlacionar, associando os quantis e ajustando uma reta ortogonal com cotovelo em ventos baixos.
                  </td>
                  <td className="py-2 px-2 text-center text-slate-400 text-[10px]">—</td>
                </tr>

                <tr>
                  <td className="py-2 px-3 font-semibold text-slate-800 dark:text-zinc-200">
                    Vertical Slice
                  </td>
                  <td className="py-2 px-2 text-center font-mono font-bold text-zinc-500">VS</td>
                  <td className="py-2 px-3 font-mono text-[10px]">Ajuste linear por partes (piecewise) em fatias</td>
                  <td className="py-2 px-2 text-center text-amber-600 dark:text-amber-400 font-semibold">Local</td>
                  <td className="py-2 px-3 text-slate-600 dark:text-zinc-300">
                    Subdivide o diagrama de dispersão em intervalos verticais de velocidade da reanálise e calcula regressões lineares locais independentes em cada faixa de vento.
                  </td>
                  <td className="py-2 px-2 text-center text-slate-400 text-[10px]">—</td>
                </tr>

                <tr>
                  <td className="py-2 px-3 font-semibold text-slate-800 dark:text-zinc-200">
                    Matrix Time Series
                  </td>
                  <td className="py-2 px-2 text-center font-mono font-bold text-teal-600 dark:text-teal-400">MTS</td>
                  <td className="py-2 px-3 font-mono text-[10px]">Matriz bivariada de transição estocástica P(y|x)</td>
                  <td className="py-2 px-2 text-center text-emerald-600 dark:text-emerald-400 font-bold">Sim (Estocástico)</td>
                  <td className="py-2 px-3 text-slate-600 dark:text-zinc-300">
                    Implementação matricial estocástica modificada (Woods & Lambert, 2005) que preserva a variabilidade aleatória e gera séries de vento sintetizadas com ruído físico realista.
                  </td>
                  <td className="py-2 px-2 text-center text-slate-400 text-[10px]">—</td>
                </tr>
              </tbody>
            </table>
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
            <h4 className="font-semibold text-slate-800 dark:text-zinc-200">3. Coeficiente de Correlação Linear de Pearson (R)</h4>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
              Quantifica o grau de acoplamento linear normalizado entre a velocidade da reanálise e a velocidade real das turbinas:
            </p>
            <div className={`p-3 rounded-xl font-mono text-[11px] my-1.5 ${isLight ? 'bg-slate-100 text-slate-800' : 'bg-zinc-950 text-zinc-300'}`}>
              r = Σ [ (x_i - x̄) * (y_i - ȳ) ] / [ sqrt( Σ (x_i - x̄)² ) * sqrt( Σ (y_i - ȳ)² ) ]
            </div>
          </div>
        </div>
      </div>

      {/* Academic & Normative References */}
      <div className={`p-6 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-zinc-800'} space-y-4 text-xs text-slate-600 dark:text-zinc-300 shadow-sm`}>
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-2">
          <BookOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Referências Bibliográficas & Normas Técnicas Internacionais
          </h3>
        </div>

        <ul className="space-y-2.5 text-[11px] leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold shrink-0">[1]</span>
            <div>
              <strong>Shepard, D. (1968).</strong> <em>"A two-dimensional interpolation function for irregularly-spaced data"</em>. Proceedings of the 1968 23rd ACM National Conference, pp. 517–524. ACM Press.
              <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">Fundamentação matemática formal da ponderação espacial pelo inverso da distância (IDW).</span>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold shrink-0">[2]</span>
            <div>
              <strong>World Meteorological Organization - WMO. (2021).</strong> <em>"Guide to Instruments and Methods of Observation (WMO-No. 8) - Volume I: Measurement of Meteorological Variables, Chapter 5: Surface Wind"</em>. Genebra: WMO.
              <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">Padronização internacional da decomposição vetorial em componentes ortogonais zonal (u) e meridional (v).</span>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold shrink-0">[3]</span>
            <div>
              <strong>International Electrotechnical Commission - IEC. (2017).</strong> <em>"IEC 61400-12-1: Wind energy generation systems - Part 12-1: Power performance measurements of electricity producing wind turbines"</em>. International Standard.
              <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">Norma técnica de avaliação anemométrica, extrapolação espacial e tratamento de incertezas em complexos eólicos.</span>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold shrink-0">[4]</span>
            <div>
              <strong>Hersbach, H., Bell, B., Berrisford, P., et al. (2020).</strong> <em>"The ERA5 global reanalysis"</em>. Quarterly Journal of the Royal Meteorological Society, 146(730), pp. 1999–2049.
              <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">Documentação e validação observacional da reanálise atmosférica global ERA5 (ECMWF).</span>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold shrink-0">[5]</span>
            <div>
              <strong>Gelaro, R., McCarty, W., Suárez, M. J., et al. (2017).</strong> <em>"The Modern-Era Retrospective Analysis for Research and Applications, Version 2 (MERRA-2)"</em>. Journal of Climate, 30(14), pp. 5419–5454.
              <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">Publicação seminal da reanálise atmosférica MERRA-2 e sistema de assimilação de dados do GMAO/NASA.</span>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold shrink-0">[6]</span>
            <div>
              <strong>Vincenty, T. (1975).</strong> <em>"Direct and Inverse Solutions of Geodesics on the Ellipsoid with application of nested equations"</em>. Survey Review, 23(176), pp. 88–93.
              <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">Equações geodésicas ortodrômicas para determinação precisa de distâncias e azimutes sobre a superfície terrestre.</span>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold shrink-0">[7]</span>
            <div>
              <strong>Derrick, A. (1992).</strong> <em>"Development of the Measure-Correlate-Predict strategy for site assessment"</em>. Proceedings of the 1992 European Wind Energy Conference (EWEC), pp. 261–265.
              <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">Artigo seminal que formalizou o termo e a metodologia analítica de Measure-Correlate-Predict (MCP) em energia eólica.</span>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold shrink-0">[8]</span>
            <div>
              <strong>Rogers, A. L., Rogers, J. W., & Manwell, J. F. (2005).</strong> <em>"Comparison of the Performance of Four Measure-Correlate-Predict Algorithms"</em>. Journal of Wind Engineering and Industrial Aerodynamics, 93(3), pp. 243–264.
              <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">Estudo comparativo de referência avaliando o desempenho empírico de Linear Least Squares (LLS), Variance Ratio (VR) e outros métodos MCP.</span>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold shrink-0">[9]</span>
            <div>
              <strong>King, K., & Hurley, P. (2005).</strong> <em>"SpeedSort: A new measure-correlate-predict algorithm for wind resource assessment"</em>. Wind Engineering, 29(4), pp. 367–380.
              <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">Fundamentação do método SpeedSort baseado na ordenação quantílica prévia e regressão ortogonal com cotovelo ("dog leg").</span>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold shrink-0">[10]</span>
            <div>
              <strong>Carta, J. A., Velázquez, S., & Cabrera, P. (2013).</strong> <em>"A review of measure-correlate-predict (MCP) methods used to estimate long-term wind characteristics at a target site"</em>. Renewable and Sustainable Energy Reviews, 27, pp. 362–400.
              <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">Revisão abrangente da literatura científica cobrindo formulações lineares, não lineares, Weibull fit e modelos bivariados.</span>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold shrink-0">[11]</span>
            <div>
              <strong>Curvers, A., & Hermsen, T. (2002).</strong> <em>"Measure-Correlate-Predict methods: A comparative study"</em>. ECN Wind Energy Report ECN-C--02-047, Petten, Holanda.
              <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">Desenvolvimento e validação do método de Razão de Variância (Variance Ratio - VR) para conservação da dispersão original.</span>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold shrink-0">[12]</span>
            <div>
              <strong>Golub, G. H., & Van Loan, C. F. (1980).</strong> <em>"An Analysis of the Total Least Squares Problem"</em>. SIAM Journal on Numerical Analysis, 17(6), pp. 883–893.
              <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">Solução algébrica formal e propriedades computacionais do método de Total Least Squares (TLS / Regressão Ortogonal).</span>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold shrink-0">[13]</span>
            <div>
              <strong>Deming, W. E. (1943).</strong> <em>"Statistical Adjustment of Data"</em>. John Wiley & Sons, New York.
              <span className="text-slate-400 dark:text-zinc-500 block text-[10px]">Tratamento estatístico de erros de medição bivariados simultâneos (regressão ortogonal de Deming).</span>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
};