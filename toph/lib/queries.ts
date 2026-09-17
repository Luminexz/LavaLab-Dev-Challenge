import { createClient } from '@/lib/supabase/server';
import type { ActivityType, Database } from '@/lib/types/database';

export type DashboardStats = Database['public']['Views']['dashboard_stats']['Row'];

export type LogRow = {
  id: string;
  employeeName: string;
  activity: ActivityType;
  logDate: string;
  fieldName: string;
  startTime: string;
  endTime: string;
};

/**
 * Everything the dashboard's first paint needs, in two queries that run
 * together rather than one after the other.
 *
 * `employees(full_name)` and `fields(name)` are Postgres joins resolved by
 * PostgREST in a single round trip — not a query per row. Getting this wrong
 * is how a four-row table becomes nine sequential requests.
 */
export async function getDashboardData(): Promise<{
  stats: DashboardStats | null;
  logs: LogRow[];
  error: string | null;
}> {
  const supabase = await createClient();

  const [statsResult, logsResult] = await Promise.all([
    supabase.from('dashboard_stats').select('*').limit(1).maybeSingle(),
    supabase
      .from('logs')
      .select(
        'id, activity, log_date, start_time, end_time, employees(full_name), fields(name)',
      )
      .eq('is_reviewed', false)
      .order('log_date', { ascending: true }),
  ]);

  const error = statsResult.error?.message ?? logsResult.error?.message ?? null;

  // PostgREST types a to-one join as possibly-array depending on how it infers
  // the relationship; normalise once here so components never deal with it.
  const one = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : v;

  const logs: LogRow[] = (logsResult.data ?? []).map((row) => ({
    id: row.id,
    employeeName: one(row.employees)?.full_name ?? 'Unknown',
    activity: row.activity,
    logDate: row.log_date,
    fieldName: one(row.fields)?.name ?? '—',
    startTime: row.start_time,
    endTime: row.end_time,
  }));

  return { stats: statsResult.data ?? null, logs, error };
}
