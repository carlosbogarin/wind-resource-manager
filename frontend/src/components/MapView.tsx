import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { SubstationGeo, ReanalysisNode } from '../types';

interface MapViewProps {
  substation: SubstationGeo | null;
  era5Nodes: ReanalysisNode[];
  merra2Nodes: ReanalysisNode[];
  selectedNodeId: string | null;
  onSelectNode: (node: ReanalysisNode) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  substation,
  era5Nodes,
  merra2Nodes,
  selectedNodeId,
  onSelectNode,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Dark Matter tile layer from CartoDB for sleek dark dashboard aesthetic
    const map = L.map(mapContainerRef.current, {
      center: [-14.235, -51.925], // Brazil center
      zoom: 5,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 19,
        subdomains: 'abcd',
      }
    ).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = layerGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers & Polygons when selection changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layers = layerGroupRef.current;
    if (!map || !layers) return;

    layers.clearLayers();

    if (!substation) return;

    const bounds = L.latLngBounds([]);

    // 1. SE Coletora Marker
    const seLatLng = L.latLng(substation.latitude, substation.longitude);
    bounds.extend(seLatLng);

    const seIconHtml = `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-8 h-8 rounded-full bg-emerald-500/30 animate-ping"></div>
        <div class="w-7 h-7 rounded-full bg-emerald-500 border-2 border-white shadow-xl flex items-center justify-center text-white font-bold text-xs">
          ⚡
        </div>
      </div>
    `;

    const seIcon = L.divIcon({
      html: seIconHtml,
      className: 'custom-se-icon',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const seMarker = L.marker(seLatLng, { icon: seIcon }).addTo(layers);
    seMarker.bindPopup(`
      <div class="p-2 space-y-1">
        <div class="flex items-center gap-1.5 font-bold text-emerald-400 text-sm">
          <span>⚡ SE Coletora</span>
        </div>
        <div class="text-xs font-semibold text-white">${substation.ensemble_name}</div>
        <div class="text-[11px] text-zinc-400">Código ONS: <span class="font-mono text-zinc-300">${substation.id_ons}</span></div>
        <div class="text-[11px] text-zinc-400">Capacidade: <span class="text-emerald-400 font-medium">${substation.capacity_mw} MW</span></div>
        <div class="text-[11px] text-zinc-400 font-mono">Coord: ${substation.latitude.toFixed(4)}, ${substation.longitude.toFixed(4)}</div>
      </div>
    `);

    // 2. ERA5 Nodes & Bounding Box (0.25°)
    if (era5Nodes.length === 4) {
      const nw = era5Nodes.find((n) => n.position === 'NW')!;
      const ne = era5Nodes.find((n) => n.position === 'NE')!;
      const se = era5Nodes.find((n) => n.position === 'SE')!;
      const sw = era5Nodes.find((n) => n.position === 'SW')!;

      if (nw && ne && se && sw) {
        const polygonPoints: [number, number][] = [
          [nw.latitude, nw.longitude],
          [ne.latitude, ne.longitude],
          [se.latitude, se.longitude],
          [sw.latitude, sw.longitude],
        ];

        L.polygon(polygonPoints, {
          color: '#06b6d4',
          weight: 1.5,
          dashArray: '4, 4',
          fillColor: '#06b6d4',
          fillOpacity: 0.08,
        }).addTo(layers);
      }

      era5Nodes.forEach((node) => {
        const pt = L.latLng(node.latitude, node.longitude);
        bounds.extend(pt);

        const isSelected = selectedNodeId === node.node_id;

        const nodeHtml = `
          <div class="relative flex items-center justify-center cursor-pointer transition-transform hover:scale-125">
            ${isSelected ? '<div class="absolute w-8 h-8 rounded-full bg-cyan-400/40 animate-pulse"></div>' : ''}
            <div class="w-6 h-6 rounded-full ${isSelected ? 'bg-cyan-400 ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : 'bg-cyan-600 border border-cyan-300'} shadow-lg flex items-center justify-center text-zinc-950 font-bold text-[10px]">
              ${node.position}
            </div>
          </div>
        `;

        const icon = L.divIcon({
          html: nodeHtml,
          className: 'custom-era5-node',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker(pt, { icon }).addTo(layers);

        marker.on('click', () => {
          onSelectNode(node);
        });

        marker.bindPopup(`
          <div class="p-2 space-y-1.5">
            <div class="flex items-center justify-between gap-2 border-b border-zinc-700 pb-1">
              <span class="font-bold text-cyan-400 text-xs">ERA5 • Nó ${node.position}</span>
              <span class="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">0.25°</span>
            </div>
            <div class="text-xs text-zinc-300">Distância SE: <strong class="text-white">${node.distance_km} km</strong> (${node.cardinal_direction})</div>
            <div class="text-[11px] text-zinc-400 font-mono">Coord: ${node.latitude.toFixed(4)}, ${node.longitude.toFixed(4)}</div>
            <div class="text-[11px] text-zinc-400">Peso IDW: <span class="text-cyan-300 font-medium">${(node.weight * 100).toFixed(1)}%</span></div>
          </div>
        `);
      });
    }

    // 3. MERRA-2 Nodes & Bounding Box (0.5° x 0.625°)
    if (merra2Nodes.length === 4) {
      const nw = merra2Nodes.find((n) => n.position === 'NW')!;
      const ne = merra2Nodes.find((n) => n.position === 'NE')!;
      const se = merra2Nodes.find((n) => n.position === 'SE')!;
      const sw = merra2Nodes.find((n) => n.position === 'SW')!;

      if (nw && ne && se && sw) {
        const polygonPoints: [number, number][] = [
          [nw.latitude, nw.longitude],
          [ne.latitude, ne.longitude],
          [se.latitude, se.longitude],
          [sw.latitude, sw.longitude],
        ];

        L.polygon(polygonPoints, {
          color: '#f59e0b',
          weight: 1.5,
          dashArray: '6, 6',
          fillColor: '#f59e0b',
          fillOpacity: 0.05,
        }).addTo(layers);
      }

      merra2Nodes.forEach((node) => {
        const pt = L.latLng(node.latitude, node.longitude);
        bounds.extend(pt);

        const isSelected = selectedNodeId === node.node_id;

        const nodeHtml = `
          <div class="relative flex items-center justify-center cursor-pointer transition-transform hover:scale-125">
            ${isSelected ? '<div class="absolute w-8 h-8 rounded-full bg-amber-400/40 animate-pulse"></div>' : ''}
            <div class="w-6 h-6 rounded-full ${isSelected ? 'bg-amber-400 ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : 'bg-amber-600 border border-amber-300'} shadow-lg flex items-center justify-center text-zinc-950 font-bold text-[10px]">
              ${node.position}
            </div>
          </div>
        `;

        const icon = L.divIcon({
          html: nodeHtml,
          className: 'custom-merra2-node',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker(pt, { icon }).addTo(layers);

        marker.on('click', () => {
          onSelectNode(node);
        });

        marker.bindPopup(`
          <div class="p-2 space-y-1.5">
            <div class="flex items-center justify-between gap-2 border-b border-zinc-700 pb-1">
              <span class="font-bold text-amber-400 text-xs">MERRA-2 • Nó ${node.position}</span>
              <span class="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">0.5°x0.625°</span>
            </div>
            <div class="text-xs text-zinc-300">Distância SE: <strong class="text-white">${node.distance_km} km</strong> (${node.cardinal_direction})</div>
            <div class="text-[11px] text-zinc-400 font-mono">Coord: ${node.latitude.toFixed(4)}, ${node.longitude.toFixed(4)}</div>
            <div class="text-[11px] text-zinc-400">Peso IDW: <span class="text-amber-300 font-medium">${(node.weight * 100).toFixed(1)}%</span></div>
          </div>
        `);
      });
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10, animate: true });
    }
  }, [substation, era5Nodes, merra2Nodes, selectedNodeId, onSelectNode]);

  return (
    <div className="relative w-full h-[460px] rounded-2xl overflow-hidden border border-zinc-800 shadow-xl bg-zinc-950">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Map Legend Floating Overlay */}
      <div className="absolute bottom-4 right-4 z-20 bg-zinc-900/90 backdrop-blur-md border border-zinc-700/80 rounded-xl p-3 shadow-2xl text-xs space-y-2 max-w-xs">
        <p className="font-semibold text-zinc-300 tracking-wide text-[11px] uppercase">Legenda da Malha</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-white flex items-center justify-center text-[8px] text-white font-bold">⚡</div>
            <span className="text-zinc-300 font-medium">SE Coletora (Subestação ONS)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-cyan-500 border border-cyan-200"></div>
            <span className="text-cyan-400 font-medium">ERA5 ECMWF (0.25° x 0.25°)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-amber-500 border border-amber-200"></div>
            <span className="text-amber-400 font-medium">MERRA-2 NASA (0.5° x 0.625°)</span>
          </div>
        </div>
        <p className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-800">
          Clique em qualquer nó no mapa ou na tabela abaixo para carregar/baixar a série temporal.
        </p>
      </div>
    </div>
  );
};