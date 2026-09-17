'use client';

import { useRef, useState } from 'react';
import { Star, X } from 'lucide-react';
import { addTagToLog, removeTagFromLog } from '@/app/actions';

/**
 * "Add Tag" — Figma I1:764;448:5994.
 *
 * A Client Component only because the input needs to open and close; the
 * writes themselves are Server Actions, so no Supabase credentials or query
 * code reach the browser. Submitting revalidates the page on the server, which
 * is what makes a tag survive a refresh.
 *
 * `suggestions` are the farm's existing tags, offered through a datalist so
 * the same concept does not get typed three slightly different ways.
 */
export function TagEditor({
  logId,
  tags,
  suggestions,
}: {
  logId: string;
  tags: { id: string; label: string }[];
  suggestions: { id: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex w-full flex-col gap-[10px]">
      {tags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-[8px]">
          {tags.map((tag) => (
            <form key={tag.id} action={removeTagFromLog}>
              <input type="hidden" name="logId" value={logId} />
              <input type="hidden" name="tagId" value={tag.id} />
              <button
                type="submit"
                className="flex items-center gap-[6px] rounded-pill border border-tag-ink/20 bg-tag px-[12px] py-[5px] text-[14px] text-tag-ink"
                title={`Remove "${tag.label}"`}
              >
                {tag.label}
                <X className="size-3 shrink-0" strokeWidth={2} aria-hidden />
              </button>
            </form>
          ))}
        </div>
      ) : null}

      {open ? (
        <form
          ref={formRef}
          action={async (formData) => {
            await addTagToLog(formData);
            formRef.current?.reset();
            setOpen(false);
          }}
          className="flex w-full items-center gap-[8px]"
        >
          <input type="hidden" name="logId" value={logId} />
          <input
            name="label"
            list="tag-suggestions"
            placeholder="Tag name"
            maxLength={40}
            autoFocus
            required
            className="flex-1 rounded-button border border-tag-ink/30 bg-surface px-[12px] py-[9px] text-[16px] text-ink outline-none placeholder:text-ink-muted"
          />
          <datalist id="tag-suggestions">
            {suggestions.map((s) => (
              <option key={s.id} value={s.label} />
            ))}
          </datalist>
          <button
            type="submit"
            className="rounded-button border border-tag-ink/20 bg-tag px-[16px] py-[9px] text-[16px] text-tag-ink"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-button border border-line px-[16px] py-[9px] text-[16px] text-ink-secondary"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-shell rounded-button border border-tag bg-tag px-[8.8px] py-[10.56px] text-[16px] text-tag-ink"
        >
          <Star className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
          Add Tag
        </button>
      )}
    </div>
  );
}
