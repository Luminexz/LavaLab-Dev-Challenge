'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/**
 * Attach a tag to a log, creating the tag if the farm has not used it before.
 *
 * Runs on the server as a Server Action, so the write happens in the same
 * trusted place as the reads and the page re-renders from the database
 * afterwards — no client-side cache to keep in sync.
 */
export async function addTagToLog(formData: FormData): Promise<void> {
  const logId = String(formData.get('logId') ?? '');
  const label = String(formData.get('label') ?? '').trim();

  if (!logId || !label) return;
  // The column is unbounded, but a tag is a label, not an essay.
  if (label.length > 40) return;

  const supabase = await createClient();

  // Every table is scoped by farm, so the new tag needs the log's farm.
  const { data: log } = await supabase
    .from('log_rows')
    .select('farm_id')
    .eq('id', logId)
    .maybeSingle();
  if (!log) return;

  // Look up, then insert if missing — rather than an upsert. An upsert issues
  // INSERT ... ON CONFLICT DO UPDATE, which would need an UPDATE policy on
  // tags; this way the browser's write surface stays at insert-only.
  const { data: existing } = await supabase
    .from('tags')
    .select('id')
    .eq('farm_id', log.farm_id)
    .eq('label', label)
    .maybeSingle();

  let tagId = existing?.id;

  if (!tagId) {
    const { data: created, error } = await supabase
      .from('tags')
      .insert({ farm_id: log.farm_id, label })
      .select('id')
      .maybeSingle();
    if (error || !created) return;
    tagId = created.id;
  }

  // log_tags has a composite primary key, so re-adding the same tag is a
  // duplicate-key error rather than a second row. Ignoring it makes the action
  // idempotent — a double click is harmless.
  await supabase.from('log_tags').insert({ log_id: logId, tag_id: tagId });

  revalidatePath('/');
}

/** Remove a tag from a log. */
export async function removeTagFromLog(formData: FormData): Promise<void> {
  const logId = String(formData.get('logId') ?? '');
  const tagId = String(formData.get('tagId') ?? '');
  if (!logId || !tagId) return;

  const supabase = await createClient();
  await supabase.from('log_tags').delete().eq('log_id', logId).eq('tag_id', tagId);

  revalidatePath('/');
}

/**
 * Mark a log reviewed, which removes it from "New Employee Logs".
 *
 * This is the only column the browser is allowed to write — enforced by the
 * column-level GRANT in 0002_rls.sql, not just by this function.
 */
export async function markLogReviewed(formData: FormData): Promise<void> {
  const logId = String(formData.get('logId') ?? '');
  if (!logId) return;

  const supabase = await createClient();
  await supabase.from('logs').update({ is_reviewed: true }).eq('id', logId);

  revalidatePath('/');
}
