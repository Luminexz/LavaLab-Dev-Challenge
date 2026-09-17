'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
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
 * Set a log's reviewed flag — the row checkbox, in both directions.
 *
 * `is_reviewed` is the only column the browser may write, and that is enforced
 * by the column-level GRANT in 0002_rls.sql rather than by this function alone.
 */
export async function setLogReviewed(formData: FormData): Promise<void> {
  const logId = String(formData.get('logId') ?? '');
  if (!logId) return;
  const reviewed = formData.get('reviewed') === 'true';

  const supabase = await createClient();
  await supabase.from('logs').update({ is_reviewed: reviewed }).eq('id', logId);

  revalidatePath('/');
}

/**
 * The header checkbox: mark everything currently listed read, or unread.
 *
 * One statement with `in`, not a request per row — marking twenty logs read
 * should be one round trip.
 */
export async function setManyReviewed(formData: FormData): Promise<void> {
  const raw = String(formData.get('logIds') ?? '');
  const reviewed = formData.get('reviewed') === 'true';

  let ids: string[];
  try {
    const parsed: unknown = JSON.parse(raw);
    ids = Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return;
  }
  if (ids.length === 0) return;

  const supabase = await createClient();
  await supabase.from('logs').update({ is_reviewed: reviewed }).in('id', ids);

  revalidatePath('/');
}

/**
 * Open a log: mark it read, then navigate to the expanded URL.
 *
 * Opening a log is what "reviewing" one means, so this mirrors an email client
 * — reading an item clears its unread state. It is done here, in an action,
 * rather than as a side effect during render: a render that writes to the
 * database runs again on every retry and refetch, and Server Components are
 * meant to be side-effect free.
 *
 * The row does not vanish underneath the reader — getDashboardData keeps the
 * expanded log in the result even once it is no longer unread. It leaves the
 * list when it is closed.
 */
export async function openLog(formData: FormData): Promise<never> {
  const logId = String(formData.get('logId') ?? '');
  const href = String(formData.get('href') ?? '/');

  if (logId) {
    const supabase = await createClient();
    await supabase.from('logs').update({ is_reviewed: true }).eq('id', logId);
    revalidatePath('/');
  }

  // Only ever navigate within this app: `href` arrives from the form, and an
  // absolute URL here would turn the button into an open redirect.
  redirect(href.startsWith('/') ? href : '/');
}
