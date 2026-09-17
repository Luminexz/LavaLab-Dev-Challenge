import Link from 'next/link';
import { AudioLines, Funnel, ListFilter, X, type LucideIcon } from 'lucide-react';
import { formatActivity, formatLogDate, formatTimeRange } from '@/lib/format';
import { ExpandedEntry } from '@/components/expanded-entry';
import { hrefWith, type RawParams } from '@/lib/url';
import type { DashboardFilters, LogDetail, LogRow } from '@/lib/queries';

/**
 * "New Employee Logs" — Figma I1:1483;448:4473.
 *
 * The Figma builds this out of nested flex rows. This uses a real <table>
 * instead: it is tabular data with a header row, and a table is what lets a
 * screen reader announce "Field, column 5" when a cell is focused. `table-fixed`
 * reproduces the design's equal-width columns.
 */

/**
 * A filter chip.
 *
 * When a chip is active the Figma swaps its icon for an X — the chip becomes
 * the control that removes it. Inactive chips show their own icon and turn the
 * filter back on, so one component covers both directions.
 */
function Chip({
  label,
  icon: Icon,
  active,
  href,
}: {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  href: string;
}) {
  const Glyph = active ? X : Icon;
  return (
    <Link
      href={href}
      className={`flex shrink-0 items-center justify-center gap-shell rounded-pill border border-line px-[16px] py-[8px] text-[14px] drop-shadow-[0px_0px_2px_rgba(0,0,0,0.05)] ${
        active ? 'bg-ink text-white' : 'bg-surface text-ink-secondary'
      }`}
    >
      <Glyph className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
      <span className="whitespace-nowrap">{label}</span>
    </Link>
  );
}

function RowCheckbox({ label }: { label: string }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      className="size-4 shrink-0 cursor-pointer appearance-none rounded-[2px] border border-ink-secondary bg-surface checked:border-ink checked:bg-ink"
    />
  );
}

const COLUMNS = ['EMPLOYEE', 'ACTIVITY', 'DATE', 'FIELD', 'TIME'] as const;
const COLSPAN = COLUMNS.length + 2;

/** date_desc -> date_asc -> employee -> date_desc */
const NEXT_SORT: Record<DashboardFilters['sort'], DashboardFilters['sort']> = {
  date_desc: 'date_asc',
  date_asc: 'employee',
  employee: 'date_desc',
};

const SORT_LABEL: Record<DashboardFilters['sort'], string> = {
  date_desc: 'Sort: Newest',
  date_asc: 'Sort: Oldest',
  employee: 'Sort: Employee',
};

export function LogsTable({
  logs,
  filters,
  params,
  detail,
  allTags,
}: {
  logs: LogRow[];
  filters: DashboardFilters;
  params: RawParams;
  detail: LogDetail | null;
  allTags: { id: string; label: string }[];
}) {
  const sortingByDate = filters.sort !== 'employee';

  return (
    <div className="w-full rounded-panel border border-hairline bg-surface">
      <div className="flex w-full items-center justify-between px-[30px] py-[20px]">
        <div className="flex shrink-0 items-center gap-[8px]">
          <AudioLines className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
          <p className="whitespace-nowrap text-[16px] text-ink">
            {filters.scope === 'new' ? 'New Employee Logs' : 'All Employee Logs'}{' '}
            <span className="text-ink-muted">({logs.length})</span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-shell">
          <Chip
            label="Date"
            icon={ListFilter}
            active={sortingByDate}
            href={hrefWith(params, { sort: sortingByDate ? 'employee' : 'date_desc' })}
          />
          <Chip
            label={SORT_LABEL[filters.sort]}
            icon={ListFilter}
            href={hrefWith(params, { sort: NEXT_SORT[filters.sort] })}
          />
          <Chip
            label={filters.thisMonth ? `This Month (${logs.length})` : 'This Month'}
            icon={ListFilter}
            active={filters.thisMonth}
            href={hrefWith(params, { month: filters.thisMonth ? '0' : '1' })}
          />
          <Chip
            label={filters.scope === 'all' ? 'All Logs' : 'Filter'}
            icon={Funnel}
            active={filters.scope === 'all'}
            href={hrefWith(params, { scope: filters.scope === 'all' ? 'new' : 'all' })}
          />
        </div>
      </div>

      {/* Column widths, measured from the Figma (node I1:1483;448:4488):
          checkbox 76px, five data columns of 223.6px each, then a 92px View
          cell with 20px of trailing gutter — 76 + (5 x 223.6) + 112 = 1306. */}
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col className="w-[76px]" />
          {COLUMNS.map((c) => (
            <col key={c} />
          ))}
          <col className="w-[112px]" />
        </colgroup>

        <thead>
          <tr className="border-b border-line opacity-30">
            <th className="py-[20px] pl-[56px] pr-[4px]">
              <span className="sr-only">Select</span>
            </th>
            {COLUMNS.map((column) => (
              <th
                key={column}
                scope="col"
                className="px-[10px] py-[20px] text-left text-[14px] font-normal text-ink-secondary"
              >
                {column}
              </th>
            ))}
            <th />
          </tr>
        </thead>

        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td
                colSpan={COLSPAN}
                className="px-[20px] py-[40px] text-center text-[14px] text-ink-muted"
              >
                {filters.q
                  ? `No logs match “${filters.q}”.`
                  : 'No logs match these filters.'}
              </td>
            </tr>
          ) : (
            logs.map((log) => {
              const isOpen = filters.expanded === log.id;
              return [
                <tr
                  key={log.id}
                  className={`h-[58px] ${isOpen ? 'bg-selected' : 'hover:bg-selected'}`}
                >
                  <td className="pl-[56px] pr-[4px]">
                    <RowCheckbox label={`Select log from ${log.employeeName}`} />
                  </td>
                  <td className="px-[10px] py-[20px] text-[14px] text-ink-secondary">
                    {log.employeeName}
                  </td>
                  <td className="px-[10px] py-[20px] text-[14px] text-ink-secondary">
                    {formatActivity(log.activity)}
                  </td>
                  <td className="px-[10px] py-[20px] text-[14px] text-ink-secondary">
                    {formatLogDate(log.logDate)}
                  </td>
                  <td className="px-[10px] py-[20px] text-[14px] text-ink-secondary">
                    {log.fieldName}
                  </td>
                  <td className="px-[10px] py-[20px] text-[14px] text-ink-secondary">
                    {formatTimeRange(log.startTime, log.endTime)}
                  </td>
                  {/* py-[12px], not py-[20px]: the button is 34px tall, so 20px
                      of padding would make this cell 74px and drag the whole
                      row up with it — a <tr> height is a minimum, not a cap. */}
                  <td className="py-[12px] pr-[20px]">
                    <Link
                      href={hrefWith(params, { expanded: isOpen ? null : log.id })}
                      scroll={false}
                      className="mx-auto flex w-fit items-center justify-center rounded-pill border border-hairline bg-surface px-[16px] py-[8px] text-[14px] text-ink-secondary drop-shadow-[0px_0px_2px_rgba(0,0,0,0.05)]"
                    >
                      {isOpen ? 'Close' : 'View'}
                    </Link>
                  </td>
                </tr>,

                isOpen && detail ? (
                  <tr key={`${log.id}-detail`}>
                    <td colSpan={COLSPAN} className="p-0">
                      <ExpandedEntry detail={detail} allTags={allTags} />
                    </td>
                  </tr>
                ) : null,
              ];
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
