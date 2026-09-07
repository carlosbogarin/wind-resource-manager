import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { SubstationGeo, ReanalysisNode } from '../types';
import { Layers, Map as MapIcon } from 'lucide-react';

interface MapViewProps {
  substation: SubstationGeo | null;
  era5Nodes: ReanalysisNode[];
  merra2Nodes: ReanalysisNode[];
  selectedNodeId: string | null;
  onSelectNode: (node: ReanalysisNode) => void;
  onMapClick?: (lat: number, lon: number) => void;
  theme?: 'light' | 'dark';
}

type MapLayerType = 'osm' | 'dark' | 'satellite';

export const MapView: React.FC<MapViewProps> = ({
  substation,
  era5Nodes,
  merra2Nodes,
  selectedNodeId,
  onSelectNode,
  onMapClick,
  theme = 'dark',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const [activeTileLayer, setActiveTileLayer] = useState<MapLayerType>(theme === 'dark' ? 'dark' : 'osm');

  // Sync activeTileLayer if theme prop changes and user hasn't explicitly chosen satellite
  useEffect(() => {
    if (activeTileLayer !== 'satellite') {
      setActiveTileLayer(theme === 'dark' ? 'dark' : 'osm');
    }
  }, [theme]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-14.235, -51.925], // Brazil center
      zoom: 5,
      zoomControl: true,
      attributionControl: false,
    });

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = layerGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer (OpenStreetMap / Dark OSM / Esri Satellite - 100% Free, NO API KEY REQUIRED)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let options: L.TileLayerOptions = {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
    };

    if (activeTileLayer === 'satellite') {
      // Esri World Imagery (High Resolution Public Satellite Imagery - Free, No API key)
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      options = {
        maxZoom: 18,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      };
    } else if (activeTileLayer === 'dark') {
      // Standard OSM with dark styling filter
      options = {
        ...options,
        className: 'dark-map-tiles',
      };
    }

    const newTileLayer = L.tileLayer(url, options).addTo(map);
    tileLayerRef.current = newTileLayer;
  }, [activeTileLayer]);

  // Handle map click for manual coordinates selection
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick(Number(e.latlng.lat.toFixed(5)), Number(e.latlng.lng.toFixed(5)));
      }
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [onMapClick]);

  // Update Markers & Polygons when selection changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layers = layerGroupRef.current;
    if (!map || !layers) return;

    layers.clearLayers();

    if (!substation) return;

    const bounds = L.latLngBounds([]);

    // 1. SE Coletora / Ponto Alvo Marker
    const isManual = substation.id_ons === 'MANUAL';
    const seLatLng = L.latLng(substation.latitude, substation.longitude);
    bounds.extend(seLatLng);

    const seIconHtml = `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-8 h-8 rounded-full ${isManual ? 'bg-cyan-500/30' : 'bg-emerald-500/30'} animate-ping"></div>
        <div class="w-7 h-7 rounded-full ${isManual ? 'bg-cyan-600' : 'bg-emerald-500'} border-2 border-white shadow-xl flex items-center justify-center text-white font-bold text-xs">
          ${isManual ? '📍' : '⚡'}
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
        <div class="flex items-center gap-1.5 font-bold ${isManual ? 'text-cyan-600 dark:text-cyan-400' : 'text-emerald-600 dark:text-emerald-400'} text-sm">
          <span>${isManual ? '📍 Ponto Alvo' : '⚡ SE Coletora'}</span>
        </div>
        <div class="text-xs font-semibold text-slate-900 dark:text-white">${substation.ensemble_name}</div>
        ${!isManual ? `<div class="text-[11px] text-slate-500 dark:text-zinc-400">Código ONS: <span class="font-mono text-slate-700 dark:text-zinc-300">${substation.id_ons}</span></div>` : ''}
        ${!isManual && substation.capacity_mw > 0 ? `<div class="text-[11px] text-slate-500 dark:text-zinc-400">Capacidade: <span class="text-emerald-600 dark:text-emerald-400 font-medium">${substation.capacity_mw} MW</span></div>` : ''}
        <div class="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">Coord: ${substation.latitude.toFixed(4)}, ${substation.longitude.toFixed(4)}</div>
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
          weight: 2,
          dashArray: '4, 4',
          fillColor: '#06b6d4',
          fillOpacity: 0.12,
        }).addTo(layers);
      }

      era5Nodes.forEach((node) => {
        const pt = L.latLng(node.latitude, node.longitude);
        bounds.extend(pt);

        const isSelected = selectedNodeId === node.node_id;

        const nodeHtml = `
          <div class="relative flex items-center justify-center cursor-pointer transition-transform hover:scale-125">
            ${isSelected ? '<div class="absolute w-8 h-8 rounded-full bg-cyan-400/40 animate-pulse"></div>' : ''}
            <div class="w-6 h-6 rounded-full ${isSelected ? 'bg-cyan-400 ring-2 ring-white ring-offset-2 ring-offset-zinc-900 text-zinc-950' : 'bg-cyan-600 border border-cyan-200 text-white'} shadow-lg flex items-center justify-center font-bold text-[10px]">
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
            <div class="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-zinc-700 pb-1">
              <span class="font-bold text-cyan-600 dark:text-cyan-400 text-xs">ERA5 • Nó ${node.position}</span>
              <span class="text-[10px] px-1.5 py-0.2 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">0.25°</span>
            </div>
            <div class="text-xs text-slate-700 dark:text-zinc-300">Distância SE: <strong class="text-slate-900 dark:text-white">${node.distance_km} km</strong> (${node.cardinal_direction})</div>
            <div class="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">Coord: ${node.latitude.toFixed(4)}, ${node.longitude.toFixed(4)}</div>
            <div class="text-[11px] text-slate-500 dark:text-zinc-400">Peso IDW: <span class="text-cyan-600 dark:text-cyan-300 font-medium">${(node.weight * 100).toFixed(1)}%</span></div>
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
          weight: 2,
          dashArray: '6, 6',
          fillColor: '#f59e0b',
          fillOpacity: 0.1,
        }).addTo(layers);
      }

      merra2Nodes.forEach((node) => {
        const pt = L.latLng(node.latitude, node.longitude);
        bounds.extend(pt);

        const isSelected = selectedNodeId === node.node_id;

        const nodeHtml = `
          <div class="relative flex items-center justify-center cursor-pointer transition-transform hover:scale-125">
            ${isSelected ? '<div class="absolute w-8 h-8 rounded-full bg-amber-400/40 animate-pulse"></div>' : ''}
            <div class="w-6 h-6 rounded-full ${isSelected ? 'bg-amber-400 ring-2 ring-white ring-offset-2 ring-offset-zinc-900 text-zinc-950' : 'bg-amber-600 border border-amber-200 text-white'} shadow-lg flex items-center justify-center font-bold text-[10px]">
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
            <div class="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-zinc-700 pb-1">
              <span class="font-bold text-amber-600 dark:text-amber-400 text-xs">MERRA-2 • Nó ${node.position}</span>
              <span class="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">0.5°x0.625°</span>
            </div>
            <div class="text-xs text-slate-700 dark:text-zinc-300">Distância SE: <strong class="text-slate-900 dark:text-white">${node.distance_km} km</strong> (${node.cardinal_direction})</div>
            <div class="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">Coord: ${node.latitude.toFixed(4)}, ${node.longitude.toFixed(4)}</div>
            <div class="text-[11px] text-slate-500 dark:text-zinc-400">Peso IDW: <span class="text-amber-600 dark:text-amber-300 font-medium">${(node.weight * 100).toFixed(1)}%</span></div>
          </div>
        `);
      });
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10, animate: true });
    }
  }, [substation, era5Nodes, merra2Nodes, selectedNodeId, onSelectNode]);

  return (
    <div className="relative z-0 w-full h-[460px] rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-xl bg-slate-100 dark:bg-zinc-950">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Layer Switcher (Top Right - Free OpenStreetMap & Satellite) */}
      <div className="absolute top-4 right-4 z-[20] flex items-center p-1 rounded-xl bg-white/95 dark:bg-zinc-900/90 backdrop-blur-md border border-slate-200 dark:border-zinc-700/80 shadow-lg text-xs">
        <button
          type="button"
          onClick={() => setActiveTileLayer('dark')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
            activeTileLayer === 'dark'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="Modo Escuro (OpenStreetMap estilizado)"
        >
          Dark
        </button>
        <button
          type="button"
          onClick={() => setActiveTileLayer('osm')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
            activeTileLayer === 'osm'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="OpenStreetMap Padrão"
        >
          Padrão
        </button>
        <button
          type="button"
          onClick={() => setActiveTileLayer('satellite')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
            activeTileLayer === 'satellite'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="Satélite HD Esri (visualização de turbinas)"
        >
          Satélite
        </button>
      </div>

      {/* Map Legend Floating Overlay (Bottom Right) */}
      <div className="absolute bottom-4 right-4 z-[20] bg-white/95 dark:bg-zinc-900/90 backdrop-blur-md border border-slate-200 dark:border-zinc-700/80 rounded-xl p-3 shadow-2xl text-xs space-y-2 max-w-xs">
        <p className="font-semibold text-slate-700 dark:text-zinc-300 tracking-wide text-[11px] uppercase">Legenda da Malha</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-white flex items-center justify-center text-[8px] text-white font-bold">⚡</div>
            <span className="text-slate-800 dark:text-zinc-300 font-medium">Ponto Alvo / SE Coletora</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-cyan-500 border border-cyan-200"></div>
            <span className="text-cyan-600 dark:text-cyan-400 font-medium">ERA5 ECMWF (0.25° x 0.25°)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-amber-500 border border-amber-200"></div>
            <span className="text-amber-600 dark:text-amber-400 font-medium">MERRA-2 NASA (0.5° x 0.625°)</span>
          </div>
        </div>
        {onMapClick && (
          <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium bg-emerald-50 dark:bg-emerald-950/60 p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
            💡 Clique no mapa para posicionar o ponto.
          </div>
        )}
        <p className="text-[10px] text-slate-500 dark:text-zinc-500 pt-1 border-t border-slate-100 dark:border-zinc-800">
          OpenStreetMap & Esri HD
        </p>
      </div>
    </div>
  );
};