import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Occurrence, Vehicle, statusLabels, priorityLabels, occurrenceTypeLabels } from '@/types/sigor';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

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

const createVehicleIcon = (hasCrew: boolean) => {
  const color = hasCrew ? '#22c55e' : '#3b82f6';
  const crewIndicator = hasCrew ? '<div style="position:absolute;top:-4px;right:-4px;width:8px;height:8px;background:#22c55e;border-radius:50%;border:1px solid white;"></div>' : '';
  
  return L.divIcon({
    className: 'vehicle-marker',
    html: `
      <div style="position:relative;">
        <div style="
          background-color: ${color};
          width: 24px;
          height: 24px;
          border-radius: 4px;
          border: 2px solid white;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
          </svg>
        </div>
        ${crewIndicator}
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

interface VehicleCrew {
  id: string;
  vehicle_id: string;
  user_id: string;
  profile?: {
    full_name: string;
  };
}

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
  center = [-24.2469, -51.6833], // Ivaiporã, Paraná
  zoom = 13,
  onOccurrenceClick,
}: OccurrencesMapProps) {
  const [mapCenter, setMapCenter] = useState<[number, number]>(center);
  const [vehicleCrews, setVehicleCrews] = useState<Record<string, VehicleCrew[]>>({});

  // Fetch crew for all vehicles
  useEffect(() => {
    const fetchCrews = async () => {
      if (vehicles.length === 0) return;

      const { data, error } = await supabase
        .from('vehicle_crew')
        .select(`
          id,
          vehicle_id,
          user_id,
          profile:profiles(full_name)
        `)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching vehicle crews:', error);
        return;
      }

      // Group by vehicle
      const grouped = (data || []).reduce((acc, crew) => {
        if (!acc[crew.vehicle_id]) {
          acc[crew.vehicle_id] = [];
        }
        acc[crew.vehicle_id].push(crew as unknown as VehicleCrew);
        return acc;
      }, {} as Record<string, VehicleCrew[]>);

      setVehicleCrews(grouped);
    };

    fetchCrews();

    // Real-time subscription
    const channel = supabase
      .channel('map-vehicle-crew')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicle_crew' },
        () => fetchCrews()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vehicles]);

  // Filter occurrences with valid coordinates
  const mappableOccurrences = occurrences.filter(
    (o) => o.latitude && o.longitude && o.status !== 'completed' && o.status !== 'cancelled'
  );

  // Filter vehicles with valid coordinates (from their base)
  const mappableVehicles = vehicles.filter(
    (v) => v.base?.latitude && v.base?.longitude && (v.status === 'busy' || vehicleCrews[v.id]?.length > 0)
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
        {mappableVehicles.map((vehicle) => {
          const crew = vehicleCrews[vehicle.id] || [];
          const hasCrew = crew.length > 0;

          return (
            <Marker
              key={vehicle.id}
              position={[vehicle.base!.latitude!, vehicle.base!.longitude!]}
              icon={createVehicleIcon(hasCrew)}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">{vehicle.identifier}</h4>
                    {hasCrew ? (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                        Em serviço
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                        Ocupada
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {vehicle.type} • Base: {vehicle.base?.name}
                  </p>
                  
                  {hasCrew && (
                    <div className="border-t pt-2 mt-2">
                      <p className="text-xs font-medium mb-1">👥 Tripulação ({crew.length}):</p>
                      <ul className="space-y-1">
                        {crew.map((member) => (
                          <li key={member.id} className="text-xs text-muted-foreground">
                            • {member.profile?.full_name || 'Nome não disponível'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
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
            <span>Viatura (ocupada)</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>Viatura (com tripulação)</span>
          </div>
        </div>
      </div>
    </div>
  );
}