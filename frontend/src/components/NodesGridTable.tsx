import React from 'react';
import { Download, CheckCircle2, Clock, Navigation, Compass, ExternalLink, Loader2 } from 'lucide-react';
import { ReanalysisNode, SubstationGeo } from '../types';

interface NodesGridTableProps {
  substation: SubstationGeo | null;
  era5Nodes: ReanalysisNode[];
  merra2Nodes: ReanalysisNode[];
  selectedNode: ReanalysisNode | null;
  onSelectNode: (node: ReanalysisNode) => void;
  onDownloadNode: (node: ReanalysisNode) => void;
  isDownloading?: boolean;
  downloadingNodeId?: string | null;
}

export const NodesGridTable: React.FC<NodesGridTableProps> = ({
  substation,
  era5Nodes,
  merra2Nodes,
  selectedNode,
  onSelectNode,
  onDownloadNode,
  isDownloading,
  downloadingNodeId,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span>Malhas de Reanálise: 4 Nós ERA5 & 4 Nós MERRA-2 Mais Próximos</span>
        </h3>
        <span className="text-xs text-zinc-400">
          Total de 8 nós geodésicos em torno da SE Coletora
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ERA5 Section */}
        <div className="bg-zinc-900/90 border border-cyan-900/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
              <span className="font-bold text-sm text-cyan-400">Nós ERA5 (ECMWF)</span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
              Grade 0.25° x 0.25° (~28 km)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {era5Nodes.map((node) => {
              const isSelected = selectedNode?.node_id === node.node_id;
              return (
                <div
                  key={node.node_id}
                  onClick={() => onSelectNode(node)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950/50'
                      : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white">{node.node_id}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        ({node.cardinal_direction})
                      </span>
                    </div>
                    {node.is_cached ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Em Cache
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                        <Clock className="w-3 h-3" /> Disponível
                      </span>
                    )}
                  </div>

                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between text-zinc-400 text-[11px]">
                      <span>Distância SE:</span>
                      <strong className="text-zinc-200">{node.distance_km} km</strong>
                    </div>
                    <div className="flex justify-between text-zinc-400 text-[11px]">
                      <span>Azimute:</span>
                      <span className="font-mono text-zinc-300">{node.bearing_deg}°</span>
                    </div>
                    <div className="flex justify-between text-zinc-400 text-[11px]">
                      <span>Peso IDW:</span>
                      <span className="text-cyan-400 font-medium">{(node.weight * 100).toFixed(1)}%</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono pt-1">
                      {node.latitude.toFixed(4)}, {node.longitude.toFixed(4)}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectNode(node);
                        onDownloadNode(node);
                      }}
                      disabled={isDownloading}
                      className="w-full text-center py-1.5 px-2 rounded-md bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isDownloading && downloadingNodeId === node.node_id ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>{node.is_cached ? 'Recarregando...' : 'Baixando...'}</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3 h-3" />
                          <span>{node.is_cached ? 'Recarregar Série' : 'Baixar Série'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* MERRA-2 Section */}
        <div className="bg-zinc-900/90 border border-amber-900/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="font-bold text-sm text-amber-400">Nós MERRA-2 (NASA GMAO)</span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60">
              Grade 0.5° x 0.625° (~50 km)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {merra2Nodes.map((node) => {
              const isSelected = selectedNode?.node_id === node.node_id;
              return (
                <div
                  key={node.node_id}
                  onClick={() => onSelectNode(node)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-950/50'
                      : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white">{node.node_id}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        ({node.cardinal_direction})
                      </span>
                    </div>
                    {node.is_cached ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Em Cache
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                        <Clock className="w-3 h-3" /> Disponível
                      </span>
                    )}
                  </div>

                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between text-zinc-400 text-[11px]">
                      <span>Distância SE:</span>
                      <strong className="text-zinc-200">{node.distance_km} km</strong>
                    </div>
                    <div className="flex justify-between text-zinc-400 text-[11px]">
                      <span>Azimute:</span>
                      <span className="font-mono text-zinc-300">{node.bearing_deg}°</span>
                    </div>
                    <div className="flex justify-between text-zinc-400 text-[11px]">
                      <span>Peso IDW:</span>
                      <span className="text-amber-400 font-medium">{(node.weight * 100).toFixed(1)}%</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono pt-1">
                      {node.latitude.toFixed(4)}, {node.longitude.toFixed(4)}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectNode(node);
                        onDownloadNode(node);
                      }}
                      disabled={isDownloading}
                      className="w-full text-center py-1.5 px-2 rounded-md bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isDownloading && downloadingNodeId === node.node_id ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>{node.is_cached ? 'Recarregando...' : 'Baixando...'}</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3 h-3" />
                          <span>{node.is_cached ? 'Recarregar Série' : 'Baixar Série'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};