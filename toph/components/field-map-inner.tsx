'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polygon, TileLayer, useMap } from 'react-leaflet';
import { divIcon, type LatLngExpression, type LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { PolygonBoundary } from '@/lib/types/database';

/**
 * The satellite view of the field — Figma I1:764;448:6672, where it is a
 * flattened screenshot. Here it is a real map drawn from the field's stored
 * boundary, so every field shows its own shape rather than one shared picture.
 *
 * Esri World Imagery is used for tiles: it needs no API key and no billing
 * account, which matters for a project that has to keep working after it is
 * handed over. Mapbox would look marginally better and would require a token
 * in the client bundle plus an account that can be rate-limited.
 *
 * Colours were sampled straight out of the Figma render rather than guessed:
 * the outline is #0065f0, and the pin is a vertical gradient from #0175f0 to
 * #00c3f0 inside a 2px white ring.
 */

const OUTLINE = '#0065f0';
/** Corner radius as a fraction of the field's shorter side, measured off the Figma. */
const CORNER_RADIUS_FRACTION = 0.28;
const ARC_SEGMENTS = 10;

/** GeoJSON stores [lng, lat]; Leaflet wants [lat, lng]. */
function toLeafletRing(boundary: PolygonBoundary): LatLngTuple[] {
  const ring = boundary?.[0] ?? [];
  return ring.map(([lng, lat]) => [lat, lng] as LatLngTuple);
}

/**
 * Replace each sharp corner with a rounded one, so the outline matches the
 * Figma's rounded rectangle.
 *
 * Leaflet can round the *stroke* joins via `lineJoin`, but the fill underneath
 * keeps its sharp corner — fine for a 1px hairline, obviously wrong at the
 * radius this design uses. So the rounding is done to the geometry itself:
 * each vertex is cut back along both of its edges and the gap bridged with a
 * quadratic Bezier, which rounds fill and stroke together.
 *
 * The maths happens in a local planar space (longitude scaled by cos(latitude))
 * rather than on raw degrees. Without that scaling a "round" corner comes out
 * visibly oval, because a degree of longitude is only ~80% of a degree of
 * latitude at this farm's latitude.
 */
function roundCorners(ring: LatLngTuple[]): LatLngTuple[] {
  // A closed ring repeats its first point last; drop it while working.
  const pts =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;

  if (pts.length < 3) return ring;

  const meanLat = pts.reduce((sum, [lat]) => sum + lat, 0) / pts.length;
  const k = Math.cos((meanLat * Math.PI) / 180);

  const planar = pts.map(([lat, lng]) => ({ x: lng * k, y: lat }));
  const xs = planar.map((p) => p.x);
  const ys = planar.map((p) => p.y);
  const shortSide = Math.min(
    Math.max(...xs) - Math.min(...xs),
    Math.max(...ys) - Math.min(...ys),
  );
  const radius = CORNER_RADIUS_FRACTION * shortSide;

  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);
  const lerp = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    t: number,
  ) => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });

  const out: LatLngTuple[] = [];
  const n = planar.length;

  for (let i = 0; i < n; i++) {
    const v = planar[i];
    const prev = planar[(i - 1 + n) % n];
    const next = planar[(i + 1) % n];

    const dPrev = dist(v, prev);
    const dNext = dist(v, next);
    if (dPrev === 0 || dNext === 0) continue;

    // Never cut back more than half an edge, or adjacent corners would overlap
    // and the polygon would fold in on itself.
    const cut = Math.min(radius, dPrev / 2, dNext / 2);

    const a = lerp(v, prev, cut / dPrev);
    const b = lerp(v, next, cut / dNext);

    for (let s = 0; s <= ARC_SEGMENTS; s++) {
      const t = s / ARC_SEGMENTS;
      const u = 1 - t;
      // Quadratic Bezier with the original corner as the control point.
      const x = u * u * a.x + 2 * u * t * v.x + t * t * b.x;
      const y = u * u * a.y + 2 * u * t * v.y + t * t * b.y;
      out.push([y, x / k] as LatLngTuple);
    }
  }

  return out;
}

/** Frames the map on the field instead of guessing a zoom level. */
function FitToField({ ring }: { ring: LatLngTuple[] }) {
  const map = useMap();
  useEffect(() => {
    if (ring.length > 0) map.fitBounds(ring, { padding: [28, 28] });
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
  const ring = useMemo(() => toLeafletRing(boundary), [boundary]);
  const rounded = useMemo(() => roundCorners(ring), [ring]);
  const center: LatLngExpression = [centerLat, centerLng];

  // A divIcon rather than a CircleMarker: the Figma pin is a vertical gradient,
  // which SVG circles cannot do without a <defs> gradient, but CSS can. It also
  // sidesteps Leaflet's default marker images, which 404 under a bundler.
  const pin = useMemo(
    () =>
      divIcon({
        className: 'toph-pin-wrapper',
        html: '<span class="toph-map-pin"></span>',
        iconSize: [17, 17],
        iconAnchor: [8.5, 8.5],
      }),
    [],
  );

  return (
    <MapContainer
      center={center}
      zoom={15}
      // Scrolling over the map should scroll the page, not zoom. Zooming is
      // still available from the controls or a trackpad pinch.
      scrollWheelZoom={false}
      className="size-full rounded-card"
      attributionControl
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles &copy; Esri"
        maxZoom={19}
      />
      {rounded.length > 0 ? (
        <Polygon
          positions={rounded}
          pathOptions={{
            color: OUTLINE,
            weight: 2.5,
            // A white wash rather than a blue one: in the Figma the field reads
            // lighter and desaturated, not tinted blue.
            fillColor: '#ffffff',
            fillOpacity: 0.38,
            lineJoin: 'round',
          }}
        />
      ) : null}
      <Marker position={center} icon={pin} alt={`${fieldName} location`} />
      <FitToField ring={ring} />
    </MapContainer>
  );
}
