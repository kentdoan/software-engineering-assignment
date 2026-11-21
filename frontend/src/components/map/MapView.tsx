import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VNU_DEFAULT_CENTER } from '../../constants/initialData';
import { Hub } from '../../types/hub.types';

interface MapViewProps {
  hubs: Hub[];
  selectedHubId: string | null;
  onSelectHub: (hub: Hub) => void;
  heightClass?: string;
}

function shortHubLabel(id: string, name: string): string {
  switch (id) {
    case 'hub-01':
      return 'Ga Metro';
    case 'hub-02':
      return 'Bách Khoa';
    case 'hub-03':
      return 'KTX A';
    case 'hub-04':
      return 'KTX B';
    case 'hub-05':
      return 'ĐH CNTT';
    case 'hub-06':
      return 'Thư viện';
    default:
      return name.replace('Trạm ', '');
  }
}

function createCampusSvgElement(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 1000 700');
  svg.innerHTML = `
    <rect width="1000" height="700" fill="#eef3f0" />
    <ellipse cx="420" cy="240" rx="220" ry="130" fill="#dfece4" />
    <ellipse cx="640" cy="460" rx="190" ry="110" fill="#e2efe8" />
    <path d="M350,210 C390,170 460,185 475,230 C485,265 445,295 395,285 C355,275 330,240 350,210 Z" fill="#cde5f0" stroke="#a6cde0" stroke-width="2" />
    <text x="412" y="242" text-anchor="middle" fill="#46768c" font-size="14" font-family="Roboto, sans-serif" font-weight="600">Hồ Đá</text>
    <path d="M80,170 Q340,210 620,250 T940,290" fill="none" stroke="#ffffff" stroke-width="10" stroke-linecap="round" />
    <path d="M120,420 Q430,360 720,390 T960,410" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" />
    <path d="M260,120 L340,620" fill="none" stroke="#ffffff" stroke-width="7" />
    <path d="M560,100 L520,640" fill="none" stroke="#ffffff" stroke-width="8" />
    <path d="M740,120 L710,630" fill="none" stroke="#ffffff" stroke-width="7" />
    <path d="M40,95 L960,130" fill="none" stroke="#f2d6a2" stroke-width="11" />
    <path d="M40,640 Q520,560 960,240" fill="none" stroke="#f2c98c" stroke-width="14" />
    <path d="M40,640 Q520,560 960,240" fill="none" stroke="#006a4e" stroke-width="2.5" stroke-dasharray="10,8" opacity="0.6" />
    <text x="165" y="88" fill="#7a8880" font-size="12" font-family="Roboto, sans-serif" font-weight="600">QUỐC LỘ 1K</text>
    <text x="775" y="345" transform="rotate(-24 775 345)" fill="#7a8880" font-size="12" font-family="Roboto, sans-serif" font-weight="600">XA LỘ HÀ NỘI · METRO SỐ 1</text>
    <text x="580" y="655" fill="#59645e" font-size="13" font-family="Roboto, sans-serif" font-weight="700" opacity="0.7">KHU ĐÔ THỊ ĐHQG-HCM</text>
  `;
  return svg;
}

/**
 * Mục đích: Hiển thị bản đồ tương tác các trạm Hub tại Khu đô thị ĐHQG-HCM bằng Leaflet kèm lớp nền dự phòng SVG và cô lập tầng xếp chồng.
 */
export const MapView: React.FC<MapViewProps> = ({
  hubs,
  selectedHubId,
  onSelectHub,
  heightClass = 'h-[360px]',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const hubsRef = useRef<Hub[]>(hubs);
  hubsRef.current = hubs;
  const fittedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [VNU_DEFAULT_CENTER.latitude, VNU_DEFAULT_CENTER.longitude],
      zoom: 14,
      minZoom: 12,
      maxZoom: 19,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const fallbackPane = map.createPane('fallbackCampusPane');
    fallbackPane.style.zIndex = '150';
    fallbackPane.style.pointerEvents = 'none';

    const campusBounds = L.latLngBounds([10.863, 106.774], [10.891, 106.814]);
    L.svgOverlay(createCampusSvgElement(), campusBounds, {
      interactive: false,
      pane: 'fallbackCampusPane',
    }).addTo(map);

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        errorTileUrl:
          'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      },
    ).addTo(map);

    const layer = L.layerGroup().addTo(map);
    mapRef.current = map;
    markersLayerRef.current = layer;

    const observer = new ResizeObserver(() => {
      map.invalidateSize();
      if (hubsRef.current.length > 0) {
        const bounds = L.latLngBounds(
          hubsRef.current.map((h) => [h.latitude, h.longitude] as [number, number]),
        );
        map.fitBounds(bounds, { padding: [36, 44], maxZoom: 15, animate: false });
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      fittedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    hubs.forEach((hub) => {
      const isSelected = hub.id === selectedHubId;
      const avail = hub.availableVehicles ?? 0;
      let bg = '#006a4e';
      if (hub.status === 'LOW_VEHICLES') bg = '#dc2626';
      else if (hub.status === 'HIGH_OCCUPANCY') bg = '#d97706';

      let lat = hub.latitude;
      let lng = hub.longitude;
      if (hub.id === 'hub-06') {
        lat -= 0.0009;
        lng -= 0.0015;
      } else if (hub.id === 'hub-05') {
        lng += 0.0018;
      }

      const icon = L.divIcon({
        className: 'custom-hub-icon',
        html: `<div class="hub-marker-bubble ${isSelected ? 'hub-marker-selected' : ''}" style="background:${bg};color:#fff;" title="${hub.name}">
          <span>${avail} xe</span>
          <span class="hub-marker-name">· ${shortHubLabel(hub.id, hub.name)}</span>
        </div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([lat, lng], { icon });
      marker.on('click', () => onSelectHub(hub));
      marker.addTo(layer);
    });

    if (hubs.length > 0 && !fittedRef.current) {
      const bounds = L.latLngBounds(hubs.map((h) => [h.latitude, h.longitude] as [number, number]));
      map.fitBounds(bounds, { padding: [52, 56], maxZoom: 15, animate: false });
      fittedRef.current = true;
    } else if (selectedHubId) {
      const target = hubs.find((h) => h.id === selectedHubId);
      if (target) {
        map.panTo([target.latitude, target.longitude], { animate: true, duration: 0.35 });
      }
    }
  }, [hubs, selectedHubId, onSelectHub]);

  return (
    <div className="relative isolate z-0 overflow-hidden rounded-3xl border border-[#dfe5e1] bg-[#eef3f0] shadow-sm">
      <div ref={containerRef} className={`w-full ${heightClass}`} />
      <div className="pointer-events-none absolute bottom-3 left-3 z-[400] flex flex-wrap gap-2 rounded-2xl border border-[#dfe5e1] bg-white/95 px-3 py-1.5 text-[11px] font-medium text-[#59645e] shadow-sm">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#006a4e]" /> Ổn định
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-600" /> Sắp đầy bãi
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-600" /> Thiếu xe
        </span>
      </div>
    </div>
  );
};
