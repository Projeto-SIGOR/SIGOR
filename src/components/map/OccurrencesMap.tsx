import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Occurrence, Vehicle, statusLabels, priorityLabels, occurrenceTypeLabels } from '@/types/sigor';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for different occurrence types and priorities
const createCustomIcon = (color: string, size: number = 25) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
};

const priorityColors: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#dc2626',
};

const vehicleIcon = L.divIcon({
  className: 'vehicle-marker',
  html: `
    <div style="
      background-color: #3b82f6;
      width: 20px;
      height: 20px;
      border-radius: 4px;
      border: 2px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
      </svg>
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});

interface MapCenterProps {
  center: [number, number];
  zoom: number;
}

function MapCenter({ center, zoom }: MapCenterProps) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  
  return null;
}

interface OccurrencesMapProps {
  occurrences: Occurrence[];
  vehicles?: Vehicle[];
  center?: [number, number];
  zoom?: number;
  onOccurrenceClick?: (occurrence: Occurrence) => void;
}

export function OccurrencesMap({
  occurrences,
  vehicles = [],
  center = [-23.5505, -46.6333], // São Paulo default
  zoom = 12,
  onOccurrenceClick,
}: OccurrencesMapProps) {
  const [mapCenter, setMapCenter] = useState<[number, number]>(center);

  // Filter occurrences with valid coordinates
  const mappableOccurrences = occurrences.filter(
    (o) => o.latitude && o.longitude && o.status !== 'completed' && o.status !== 'cancelled'
  );

  // Filter vehicles with valid coordinates (from their base)
  const mappableVehicles = vehicles.filter(
    (v) => v.base?.latitude && v.base?.longitude && v.status === 'busy'
  );

  // Update center when occurrences change
  useEffect(() => {
    if (mappableOccurrences.length > 0) {
      const firstWithCoords = mappableOccurrences[0];
      if (firstWithCoords.latitude && firstWithCoords.longitude) {
        setMapCenter([firstWithCoords.latitude, firstWithCoords.longitude]);
      }
    }
  }, [mappableOccurrences]);

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-lg overflow-hidden border border-border">
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapCenter center={mapCenter} zoom={zoom} />

        {/* Occurrence markers */}
        {mappableOccurrences.map((occurrence) => (
          <Marker
            key={occurrence.id}
            position={[occurrence.latitude!, occurrence.longitude!]}
            icon={createCustomIcon(priorityColors[occurrence.priority] || '#6b7280')}
            eventHandlers={{
              click: () => onOccurrenceClick?.(occurrence),
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {occurrence.code}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: priorityColors[occurrence.priority] + '20',
                      color: priorityColors[occurrence.priority],
                    }}
                  >
                    {priorityLabels[occurrence.priority]}
                  </span>
                </div>
                <h4 className="font-semibold text-sm mb-1">{occurrence.title}</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  {occurrenceTypeLabels[occurrence.type]} • {statusLabels[occurrence.status]}
                </p>
                {occurrence.location_address && (
                  <p className="text-xs text-muted-foreground">
                    📍 {occurrence.location_address}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  🕐 {format(new Date(occurrence.created_at), "dd/MM HH:mm", { locale: ptBR })}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Vehicle markers */}
        {mappableVehicles.map((vehicle) => (
          <Marker
            key={vehicle.id}
            position={[vehicle.base!.latitude!, vehicle.base!.longitude!]}
            icon={vehicleIcon}
          >
            <Popup>
              <div className="p-2">
                <h4 className="font-semibold text-sm">{vehicle.identifier}</h4>
                <p className="text-xs text-muted-foreground">
                  {vehicle.type} • Em atendimento
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Base: {vehicle.base?.name}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-border z-[1000]">
        <p className="text-xs font-semibold mb-2">Legenda</p>
        <div className="space-y-1">
          {Object.entries(priorityColors).map(([priority, color]) => (
            <div key={priority} className="flex items-center gap-2 text-xs">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span>{priorityLabels[priority as keyof typeof priorityLabels]}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 text-xs mt-2 pt-2 border-t border-border">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span>Viatura</span>
          </div>
        </div>
      </div>
    </div>
  );
}
