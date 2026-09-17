import { RecordingPlayer } from '@/components/recording-player';
import { TagEditor } from '@/components/tag-editor';
import { FieldMap } from '@/components/field-map';
import type { LogDetail } from '@/lib/queries';

/**
 * The panel that opens under a row — Figma I1:764;448:5886.
 *
 * Measured from the Figma: 40px padding, a 40px gutter, and two columns of
 * 592 and 594 within the 1306px table (40 + 592 + 40 + 594 + 40 = 1306). The
 * columns are equal to within 2px, so they are written as equal flex children
 * rather than hardcoding both widths — that also lets the panel narrow
 * gracefully below the design width.
 *
 * A Server Component: the transcript and field geometry arrive already
 * rendered. Only the three genuinely interactive pieces — the player, the tag
 * editor, the map — are Client Components.
 */
export function ExpandedEntry({
  detail,
  allTags,
}: {
  detail: LogDetail;
  allTags: { id: string; label: string }[];
}) {
  const body = detail.summary ?? detail.transcript;

  return (
    <div className="flex w-full items-start gap-[40px] bg-surface p-[40px]">
      {/* Left: recording, tags, summary */}
      <div className="flex min-w-0 flex-1 flex-col gap-[20px]">
        <RecordingPlayer
          logId={detail.id}
          audioUrl={detail.audioUrl}
          durationSeconds={detail.audioDurationSeconds}
        />

        <TagEditor logId={detail.id} tags={detail.tags} suggestions={allTags} />

        <div className="flex flex-col gap-[4px]">
          <h3 className="text-[16px] text-ink">Summary</h3>
          <p className="text-[16px] text-ink opacity-30">
            {body ?? 'No transcript was captured for this recording.'}
          </p>
        </div>
      </div>

      {/* Right: satellite view of the field */}
      <div className="flex min-w-0 flex-1 flex-col">
        <FieldMap
          boundary={detail.boundary}
          centerLat={detail.centerLat}
          centerLng={detail.centerLng}
          fieldName={detail.fieldName}
        />
      </div>
    </div>
  );
}
