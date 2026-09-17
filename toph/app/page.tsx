import { Calendar, ClipboardPen, Percent, Search } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { StatCard } from '@/components/stat-card';
import { LogsTable } from '@/components/logs-table';
import { getDashboardData } from '@/lib/queries';

/**
 * The dashboard — Figma node 1:1481.
 *
 * A Server Component: the Supabase query runs on the server during the render,
 * so the browser gets finished HTML instead of an empty table plus a fetch.
 *
 * force-dynamic because the stats are time-sensitive ("Todays Recordings",
 * "logs in the last hour"). Prerendering this at build time would freeze those
 * numbers at whenever the deploy happened.
 */
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { stats, logs, error } = await getDashboardData();

  return (
    // The Figma canvas is a fixed 1676px: 10 gutter + 280 sidebar + 10 gap +
    // 1366 main + 10 gutter. Capping the shell at that width and centring it
    // keeps the table's five columns at their designed 223.6px instead of
    // stretching them across a wide monitor, which is what made the fields
    // read as too far apart. Below 1676px everything still flexes down.
    <div className="mx-auto flex size-full min-h-screen max-w-[1676px] items-stretch gap-shell bg-surface p-shell">
      <Sidebar newCount={stats?.new_today ?? 0} />

      <main className="flex min-w-0 max-w-[1366px] flex-1 flex-col gap-shell px-[30px]">
        {/* Page header */}
        <header className="flex w-full shrink-0 items-center justify-between py-[20px]">
          <div className="flex shrink-0 flex-col">
            <h1 className="whitespace-nowrap text-[20px] font-semibold text-ink">
              Dashboard
            </h1>
            <p className="whitespace-nowrap text-[16px] text-ink-secondary">
              An overview of your farm and employee activity
            </p>
          </div>
          {/* Presentational for now — Phase 3 makes this query the database. */}
          <div className="flex w-[370px] shrink-0 items-center gap-shell rounded-[30px] border border-line bg-surface px-[16px] py-[8px] drop-shadow-[0px_0px_2px_rgba(0,0,0,0.05)]">
            <Search className="size-4 shrink-0 text-ink" strokeWidth={1.5} aria-hidden />
            <input
              type="search"
              placeholder="Search"
              aria-label="Search logs"
              className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-[#ccc]"
            />
          </div>
        </header>

        {error ? (
          <p className="rounded-card border border-line bg-surface-sunken p-[20px] text-[14px] text-ink-secondary">
            Could not load dashboard data: {error}
          </p>
        ) : null}

        {/* Stat cards. Every number comes from the dashboard_stats view. */}
        <div className="flex w-full shrink-0 items-start gap-shell">
          <StatCard
            label="Todays Recordings"
            value={stats?.todays_recordings ?? 0}
            icon={Calendar}
            note={stats?.new_today ? `${stats.new_today} New` : undefined}
          />
          <StatCard
            label="Active Workers"
            value={stats?.active_workers ?? 0}
            icon={ClipboardPen}
          />
          <StatCard
            label="Response Accuracy"
            value={stats?.response_accuracy ?? 0}
            icon={Percent}
          />
        </div>

        <LogsTable logs={logs} count={stats?.unreviewed_logs ?? logs.length} />
      </main>
    </div>
  );
}
