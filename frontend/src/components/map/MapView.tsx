'use client';

import { useEffect } from 'react';
import L from 'leaflet';
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  ZoomControl,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { RouteGeometry } from '@/lib/types';

const TILES_URL =
  process.env.NEXT_PUBLIC_MAP_TILES_URL ||
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || '© OpenStreetMap contributors';

const originIcon = L.divIcon({
  className: '',
  html: '<span style="display:block;width:18px;height:18px;border-radius:50%;background:#FD7624;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.35)"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const destinationIcon = L.divIcon({
  className: '',
  html: '<span style="display:block;width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#0B0B0B;border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.4)"><span style="display:block;width:8px;height:8px;border-radius:50%;background:#FD7624;margin:6px"></span></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

const stopIcon = L.divIcon({
  className: '',
  html: '<span style="display:block;width:14px;height:14px;border-radius:50%;background:#fff;border:2px solid #0B0B0B;box-shadow:0 1px 4px rgba(0,0,0,.3)"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const driverIcon = L.divIcon({
  className: '',
  html: '<span style="display:block;width:22px;height:22px;background:#0B0B0B;border:3px solid #FD7624;box-shadow:0 1px 6px rgba(0,0,0,.4)"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  const [lat, lng] = center;

  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, map]);

  return null;
}

function FitRoute({
  origin,
  destination,
  stops = [],
}: {
  origin: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  stops?: Array<{ lat: number; lng: number }>;
}) {
  const map = useMap();
  const originLat = origin?.lat;
  const originLng = origin?.lng;
  const destinationLat = destination?.lat;
  const destinationLng = destination?.lng;
  const stopsKey = stops.map((stop) => `${stop.lat},${stop.lng}`).join('|');

  useEffect(() => {
    if (
      originLat === undefined ||
      originLng === undefined ||
      destinationLat === undefined ||
      destinationLng === undefined
    ) {
      return;
    }

    const bounds = L.latLngBounds([
      [originLat, originLng],
      [destinationLat, destinationLng],
      ...stops.map((stop) => [stop.lat, stop.lng] as [number, number]),
    ]);
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
    // stopsKey representa la lista de paradas sin depender de la identidad del arreglo.
  }, [originLat, originLng, destinationLat, destinationLng, stopsKey, map]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function MapEvents({
  enabled,
  onMapClick,
}: {
  enabled: boolean;
  onMapClick?: (point: { lat: number; lng: number }) => void;
}) {
  const map = useMapEvents({
    click(event) {
      if (!enabled || !onMapClick) return;
      onMapClick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });

  useEffect(() => {
    const container = map.getContainer();
    container.classList.toggle('ruta-map-picking', enabled);
    return () => container.classList.remove('ruta-map-picking');
  }, [enabled, map]);

  return null;
}

export interface MapViewProps {
  center: [number, number];
  zoom?: number;
  origin?: { lat: number; lng: number } | null;
  destination?: { lat: number; lng: number } | null;
  stops?: Array<{ lat: number; lng: number }>;
  driver?: { lat: number; lng: number } | null;
  route?: RouteGeometry | null;
  onMapClick?: (point: { lat: number; lng: number }) => void;
  picking?: boolean;
}

export default function MapView({
  center,
  zoom = 14,
  origin = null,
  destination = null,
  stops = [],
  driver = null,
  route = null,
  onMapClick,
  picking = false,
}: MapViewProps) {
  const routePositions: Array<[number, number]> =
    route?.coordinates?.map(([lng, lat]) => [lat, lng]) ?? [];

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      zoomControl={false}
      scrollWheelZoom
      className="h-full w-full"
      attributionControl
    >
      <TileLayer url={TILES_URL} attribution={ATTRIBUTION} maxZoom={19} />
      <ZoomControl position="bottomright" />
      <Recenter center={center} />
      <FitRoute origin={origin} destination={destination} stops={stops} />
      <MapEvents enabled={picking} onMapClick={onMapClick} />

      {routePositions.length > 1 && (
        <Polyline positions={routePositions} pathOptions={{ color: '#FD7624', weight: 5 }} />
      )}

      {stops.map((stop, index) => (
        <Marker
          key={`${stop.lat}-${stop.lng}-${index}`}
          position={[stop.lat, stop.lng]}
          icon={stopIcon}
        />
      ))}

      {driver && (
        <Marker position={[driver.lat, driver.lng]} icon={driverIcon} />
      )}

      {origin && <Marker position={[origin.lat, origin.lng]} icon={originIcon} />}
      {destination && (
        <Marker position={[destination.lat, destination.lng]} icon={destinationIcon} />
      )}
    </MapContainer>
  );
}
