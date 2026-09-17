import { createClient } from '@/lib/supabase/server';
import { RECORDINGS_BUCKET } from '@/lib/storage';
import type { ActivityType, Database, PolygonBoundary } from '@/lib/types/database';

export type DashboardStats = Database['public']['Views']['dashboard_stats']['Row'];

/** Every knob the dashboard exposes, read from the URL. */
export type DashboardFilters = {
  /** Free text across employee name, field name and activity. */
  q: string;
  /** The "Filter" chip: just the unreviewed logs, or all of them. */
  scope: 'new' | 'all';
  /** The "This Month" chip. Removable, hence a boolean rather than a range. */
  thisMonth: boolean;
  /** The "Date" and "Sort" chips. */
  sort: 'date_desc' | 'date_asc' | 'employee';
  /** Which row is expanded, if any. */
  expanded: string | null;
};

/**
 * Filters live in the URL rather than in React state, deliberately:
 *
 *  - The brief asks that a refresh keep working. A URL survives refresh;
 *    useState does not.
 *  - It keeps the page a Server Component. Changing a filter re-runs the query
 *    on the server instead of shipping a filtering implementation to the
 *    browser and re-fetching from there.
 *  - Any view of the dashboard is a link someone can send to a colleague.
 */
/** `expanded` is interpolated into a PostgREST filter, so only accept a UUID. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseFilters(params: Record<string, string | string[] | undefined>): DashboardFilters {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const sort = one(params.sort);
  const expanded = one(params.expanded) ?? '';

  return {
    q: (one(params.q) ?? '').trim(),
    scope: one(params.scope) === 'all' ? 'all' : 'new',
    // Active unless explicitly removed, matching the chip's default state.
    thisMonth: one(params.month) !== '0',
    sort: sort === 'date_asc' || sort === 'employee' ? sort : 'date_desc',
    expanded: UUID.test(expanded) ? expanded : null,
  };
}

export type LogRow = {
  id: string;
  employeeName: string;
  activity: ActivityType;
  logDate: string;
  fieldName: string;
  startTime: string;
  endTime: string;
  isReviewed: boolean;
};

export type LogDetail = LogRow & {
  transcript: string | null;
  summary: string | null;
  audioUrl: string | null;
  audioDurationSeconds: number | null;
  chemicalName: string | null;
  chemicalReiHours: number | null;
  centerLat: number;
  centerLng: number;
  boundary: PolygonBoundary;
  tags: { id: string; label: string }[];
};

/** First and last day of the current month, as YYYY-MM-DD. */
function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`;
  return {
    from: iso(new Date(now.getFullYear(), now.getMonth(), 1)),
    // Day 0 of next month is the last day of this one.
    to: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

export async function getDashboardData(filters: DashboardFilters): Promise<{
  stats: DashboardStats | null;
  logs: LogRow[];
  detail: LogDetail | null;
  allTags: { id: string; label: string }[];
  error: string | null;
}> {
  const supabase = await createClient();

  let logsQuery = supabase
    .from('log_rows')
    .select(
      'id, employee_name, activity, log_date, field_name, start_time, end_time, is_reviewed',
    );

  if (filters.scope === 'new') {
    // Opening a log marks it read (see openLog in app/actions.ts). If the list
    // were strictly "unread", the row would disappear the instant it was
    // opened, taking the panel with it. Keeping the expanded log in the result
    // lets it stay until the reader closes it.
    logsQuery = filters.expanded
      ? logsQuery.or(`is_reviewed.eq.false,id.eq.${filters.expanded}`)
      : logsQuery.eq('is_reviewed', false);
  }

  if (filters.thisMonth) {
    const { from, to } = currentMonthRange();
    logsQuery = logsQuery.gte('log_date', from).lte('log_date', to);
  }

  if (filters.q) {
    // Commas and parens are the OR syntax's own delimiters, so strip them
    // rather than let a stray character produce a malformed filter.
    const safe = filters.q.replace(/[,()]/g, ' ').trim();
    if (safe) {
      logsQuery = logsQuery.or(
        `employee_name.ilike.%${safe}%,field_name.ilike.%${safe}%,activity_text.ilike.%${safe}%`,
      );
    }
  }

  logsQuery =
    filters.sort === 'employee'
      ? logsQuery.order('employee_name', { ascending: true })
      : logsQuery.order('log_date', { ascending: filters.sort === 'date_asc' });

  const [statsResult, logsResult, tagsResult] = await Promise.all([
    supabase.from('dashboard_stats').select('*').limit(1).maybeSingle(),
    logsQuery,
    supabase.from('tags').select('id, label').order('label'),
  ]);

  const logs: LogRow[] = (logsResult.data ?? []).map((r) => ({
    id: r.id,
    employeeName: r.employee_name,
    activity: r.activity,
    logDate: r.log_date,
    fieldName: r.field_name,
    startTime: r.start_time,
    endTime: r.end_time,
    isReviewed: r.is_reviewed,
  }));

  // Only fetch the full record for the row that is actually open. Transcripts
  // are long; loading one for every row would waste most of the payload.
  let detail: LogDetail | null = null;
  let detailError: string | null = null;
  if (filters.expanded) {
    const [detailResult, logTagsResult] = await Promise.all([
      supabase.from('log_rows').select('*').eq('id', filters.expanded).maybeSingle(),
      supabase.from('log_tags').select('tag_id, tags(id, label)').eq('log_id', filters.expanded),
    ]);

    detailError = detailResult.error?.message ?? null;
    const d = detailResult.data;
    if (d) {
      const tags = (logTagsResult.data ?? [])
        .map((lt) => (Array.isArray(lt.tags) ? lt.tags[0] : lt.tags))
        .filter((t): t is { id: string; label: string } => Boolean(t));

      detail = {
        id: d.id,
        employeeName: d.employee_name,
        activity: d.activity,
        logDate: d.log_date,
        fieldName: d.field_name,
        startTime: d.start_time,
        endTime: d.end_time,
        isReviewed: d.is_reviewed,
        transcript: d.transcript,
        summary: d.summary,
        // The database stores an object path; the host comes from this
        // client's configuration. getPublicUrl is pure string building — it
        // makes no network call — so resolving here costs nothing and keeps
        // the player component unaware of Storage entirely.
        audioUrl: d.audio_path
          ? supabase.storage.from(RECORDINGS_BUCKET).getPublicUrl(d.audio_path).data.publicUrl
          : null,
        audioDurationSeconds: d.audio_duration_seconds,
        chemicalName: d.chemical_name,
        chemicalReiHours: d.chemical_rei_hours,
        centerLat: d.center_lat,
        centerLng: d.center_lng,
        boundary: d.boundary,
        tags,
      };
    }
  }

  return {
    stats: statsResult.data ?? null,
    logs,
    detail,
    allTags: tagsResult.data ?? [],
    error: statsResult.error?.message ?? logsResult.error?.message ?? detailError,
  };
}
