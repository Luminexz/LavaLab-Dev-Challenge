import { Calendar, ClipboardPen, Percent, Search } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { StatCard } from '@/components/stat-card';
import { LogsTable } from '@/components/logs-table';
import { getDashboardData, parseFilters } from '@/lib/queries';
import type { RawParams } from '@/lib/url';

/**
 * The dashboard — Figma node 1:1481 (default) and 1:762 (expanded entry).
 *
 * A Server Component: the Supabase queries run on the server during the render,
 * so the browser gets finished HTML instead of an empty table plus a fetch.
 * Search, sorting, the filter chips and which row is open all live in the URL,
 * so each of them re-runs the query here rather than filtering in the browser.
 *
 * force-dynamic because the stats are time-sensitive ("Todays Recordings",
 * "logs in the last hour") and the URL drives the query. Prerendering this at
 * build time would freeze those numbers at whenever the deploy happened.
 */
export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const { stats, logs, detail, allTags, error } = await getDashboardData(filters);

  return (
    // The Figma canvas is a fixed 1676px: 10 gutter + 280 sidebar + 10 gap +
    // 1366 main + 10 gutter. Capping the shell at that width and centring it
    // keeps the table's five columns at their designed 223.6px instead of
    // stretching them across a wide monitor. Below 1676px everything flexes.
    // h-screen + overflow-hidden pins the shell to the viewport so the sidebar
    // stays put; the main column owns its own scrollbar. The sidebar gets one
    // too, for laptop screens shorter than its 935px design height.
    <div className="mx-auto flex h-screen w-full max-w-[1676px] items-stretch gap-shell overflow-hidden bg-surface p-shell">
      <Sidebar newCount={stats?.new_today ?? 0} />

      <main className="flex min-w-0 max-w-[1366px] flex-1 flex-col gap-shell overflow-y-auto px-[30px]">
        <header className="flex w-full shrink-0 items-center justify-between py-[20px]">
          <div className="flex shrink-0 flex-col">
            <h1 className="whitespace-nowrap text-[20px] font-semibold text-ink">Dashboard</h1>
            <p className="whitespace-nowrap text-[16px] text-ink-secondary">
              An overview of your farm and employee activity
            </p>
          </div>

          {/*
            A plain GET form, not an onChange handler. Submitting navigates to
            /?q=..., which re-runs the query on the server — so search works
            with JavaScript disabled, and the result is a URL you can share or
            reload. The hidden fields carry the other filters through;
            `expanded` is deliberately dropped, since the row that was open may
            not be in the new results.
          */}
          <form
            action="/"
            method="get"
            className="flex w-[370px] shrink-0 items-center gap-shell rounded-[30px] border border-line bg-surface px-[16px] py-[8px] drop-shadow-[0px_0px_2px_rgba(0,0,0,0.05)]"
          >
            <input type="hidden" name="scope" value={filters.scope} />
            <input type="hidden" name="month" value={filters.thisMonth ? '1' : '0'} />
            <input type="hidden" name="sort" value={filters.sort} />
            <button type="submit" aria-label="Search" className="shrink-0">
              <Search className="size-4 text-ink" strokeWidth={1.5} aria-hidden />
            </button>
            <input
              type="search"
              name="q"
              defaultValue={filters.q}
              placeholder="Search"
              aria-label="Search logs by employee, activity or field"
              className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-[#ccc]"
            />
          </form>
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

        <LogsTable
          logs={logs}
          filters={filters}
          params={params}
          detail={detail}
          allTags={allTags}
        />
      </main>
    </div>
  );
}
