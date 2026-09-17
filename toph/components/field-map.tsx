'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Maximize2, X } from 'lucide-react';
import type { PolygonBoundary } from '@/lib/types/database';

/**
 * Leaflet reaches for `window` the moment it is imported, so it cannot be part
 * of a server render. `dynamic(..., { ssr: false })` keeps it out of the server
 * bundle entirely — and `ssr: false` is only legal inside a Client Component,
 * which is why this thin wrapper exists rather than importing the map directly
 * into the page.
 *
 * The placeholder keeps the same 335px box while the chunk loads, so the
 * expanded row does not jump height.
 */
const FieldMapInner = dynamic(() => import('./field-map-inner'), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center rounded-card border-[0.88px] border-line bg-surface-sunken text-[14px] text-ink-muted">
      Loading map…
    </div>
  ),
});

export function FieldMap({
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
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <div className="h-[335px] w-full overflow-hidden rounded-card border-[0.88px] border-line">
        <FieldMapInner
          boundary={boundary}
          centerLat={centerLat}
          centerLng={centerLng}
          fieldName={fieldName}
        />
      </div>

      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex w-full items-center justify-center gap-shell rounded-button border border-ink bg-surface px-[8.8px] py-[10.56px] text-[16px] text-ink"
      >
        <Maximize2 className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
        Expand Map
      </button>

      {expanded ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${fieldName} map`}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-[40px]"
          onClick={() => setExpanded(false)}
        >
          {/* Stop the click from reaching the backdrop and closing immediately. */}
          <div
            className="relative size-full overflow-hidden rounded-panel bg-surface"
            onClick={(e) => e.stopPropagation()}
          >
            <FieldMapInner
              boundary={boundary}
              centerLat={centerLat}
              centerLng={centerLng}
              fieldName={fieldName}
            />
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Close map"
              className="absolute right-[16px] top-[16px] z-[1000] flex size-[34px] items-center justify-center rounded-pill border border-line bg-surface text-ink shadow"
            >
              <X className="size-4" strokeWidth={1.5} aria-hidden />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
