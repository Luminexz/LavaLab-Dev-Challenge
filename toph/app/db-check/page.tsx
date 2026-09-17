import { createClient } from '@/lib/supabase/server';

/**
 * Temporary end-to-end check: proves the schema, the seed, the env vars and the
 * Supabase client all line up, both locally and on Vercel. Delete once the real
 * dashboard renders this data.
 *
 * force-dynamic keeps this off the build-time prerender, so a missing env var
 * fails as a readable page rather than a failed deployment.
 */
export const dynamic = 'force-dynamic';

export default async function DbCheck() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return (
      <main style={{ font: '14px ui-monospace, monospace', padding: 32 }}>
        <h1>DB check</h1>
        <p>
          NEXT_PUBLIC_SUPABASE_URL is not set. Copy <code>.env.local.example</code> to{' '}
          <code>.env.local</code> and fill it in.
        </p>
      </main>
    );
  }

  const supabase = await createClient();

  // One query, joined the way the dashboard table will need it.
  const { data: logs, error } = await supabase
    .from('logs')
    .select('log_date, start_time, end_time, activity, employees(full_name), fields(name)')
    .eq('is_reviewed', false)
    .order('log_date', { ascending: true });

  const [{ count: todays }, { count: workers }] = await Promise.all([
    supabase
      .from('logs')
      .select('*', { count: 'exact', head: true })
      .eq('log_date', new Date().toISOString().slice(0, 10)),
    supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
  ]);

  return (
    <main style={{ font: '14px ui-monospace, monospace', padding: 32, lineHeight: 1.7 }}>
      <h1>DB check</h1>

      {error ? (
        <p style={{ color: '#b00' }}>Query failed: {error.message}</p>
      ) : (
        <>
          <p>
            Todays Recordings: <b>{todays}</b> (expect 5) &nbsp;|&nbsp; Active Workers:{' '}
            <b>{workers}</b> (expect 12) &nbsp;|&nbsp; New Employee Logs: <b>{logs?.length}</b>{' '}
            (expect 4)
          </p>
          <ul>
            {logs?.map((l, i) => (
              <li key={i}>
                {/* Supabase types a to-one join as possibly-array; narrow for display. */}
                {(Array.isArray(l.employees) ? l.employees[0] : l.employees)?.full_name} —{' '}
                {l.activity} — {l.log_date} —{' '}
                {(Array.isArray(l.fields) ? l.fields[0] : l.fields)?.name} — {l.start_time}–
                {l.end_time}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
