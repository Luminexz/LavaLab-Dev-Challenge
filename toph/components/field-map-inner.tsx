'use client';

import { useEffect } from 'react';
import { CircleMarker, MapContainer, Polygon, TileLayer, useMap } from 'react-leaflet';
import type { LatLngExpression, LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { PolygonBoundary } from '@/lib/types/database';

/**
 * The satellite view of the field — Figma I1:764;448:6672, where it is a
 * flattened screenshot. Here it is a real map drawn from the field's stored
 * boundary, so every field shows its own shape rather than one shared picture.
 *
 * Esri World Imagery is used for tiles: it needs no API key and no billing
 * account, which matters for a project that has to keep working after it is
 * handed over. Mapbox would look slightly better and would require a token in
 * the client bundle plus an account that can be rate-limited.
 */

/** GeoJSON stores [lng, lat]; Leaflet wants [lat, lng]. */
function toLeafletRing(boundary: PolygonBoundary): LatLngTuple[] {
  const ring = boundary?.[0] ?? [];
  return ring.map(([lng, lat]) => [lat, lng] as LatLngTuple);
}

/** Frames the map on the field instead of guessing a zoom level. */
function FitToField({ ring }: { ring: LatLngTuple[] }) {
  const map = useMap();
  useEffect(() => {
    if (ring.length > 0) map.fitBounds(ring, { padding: [24, 24] });
  }, [map, ring]);
  return null;
}

export default function FieldMapInner({
  boundary,
  centerLat,
  centerLng,
  fieldName,
}: {
  boundary: PolygonBoundary;
  centerLat: number;
  centerLng: number;
  fieldName: string;
}) {
  const ring = toLeafletRing(boundary);
  const center: LatLngExpression = [centerLat, centerLng];

  return (
    <MapContainer
      center={center}
      zoom={15}
      // Scroll over the map should scroll the page, not zoom. Zooming is still
      // available via the controls or a pinch.
      scrollWheelZoom={false}
      className="size-full rounded-card"
      attributionControl
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles &copy; Esri"
        maxZoom={19}
      />
      {ring.length > 0 ? (
        <Polygon
          positions={ring}
          pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#4a90d9', fillOpacity: 0.25 }}
        />
      ) : null}
      <CircleMarker
        center={center}
        radius={7}
        pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#1a73e8', fillOpacity: 1 }}
        aria-label={`${fieldName} location`}
      />
      <FitToField ring={ring} />
    </MapContainer>
  );
}
