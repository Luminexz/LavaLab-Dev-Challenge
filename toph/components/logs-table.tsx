import { AudioLines, Funnel, ListFilter, X, type LucideIcon } from 'lucide-react';
import { formatActivity, formatLogDate, formatTimeRange } from '@/lib/format';
import type { LogRow } from '@/lib/queries';

/**
 * "New Employee Logs" — Figma node I1:1483;448:4473.
 *
 * The Figma builds this out of nested flex rows. This uses a real <table>
 * instead: it is tabular data with a header row, and a table is what lets a
 * screen reader announce "Field, column 5" when a cell is focused. `table-fixed`
 * reproduces the design's equal-width columns — the five data columns split
 * whatever the two fixed columns leave, which is what `flex-[1_0_0]` did.
 */

/** A filter chip. `active` is the black state from the design. */
function Chip({
  label,
  icon: Icon,
  active,
}: {
  label: string;
  icon: LucideIcon;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={`flex shrink-0 items-center justify-center gap-shell rounded-pill border border-line px-[16px] py-[8px] text-[14px] drop-shadow-[0px_0px_2px_rgba(0,0,0,0.05)] ${
        active ? 'bg-ink text-white' : 'bg-surface text-ink-secondary'
      }`}
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

/**
 * The design's checkbox is a plain square outline. A real <input> keeps it
 * keyboard-reachable and announces its state; `appearance-none` lets it be
 * styled to match without fighting the browser's native control.
 */
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

export function LogsTable({ logs, count }: { logs: LogRow[]; count: number }) {
  return (
    <div className="w-full rounded-panel border border-hairline bg-surface">
      {/* Card header: title + filter chips. 30px horizontal padding and a
          74px band (20 + the 34px chips + 20), per Figma I1:1483;448:4471. */}
      <div className="flex w-full items-center justify-between px-[30px] py-[20px]">
        <div className="flex shrink-0 items-center gap-[8px]">
          <AudioLines className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
          <p className="whitespace-nowrap text-[16px] text-ink">
            New Employee Logs <span className="text-ink-muted">({count})</span>
          </p>
        </div>
        {/* Presentational for now — Phase 3 wires these to real queries. */}
        <div className="flex shrink-0 items-center gap-shell">
          <Chip label="Date" icon={X} active />
          <Chip label="Sort" icon={ListFilter} />
          <Chip label={`This Month (${count})`} icon={X} active />
          <Chip label="Filter" icon={Funnel} />
        </div>
      </div>

      <table className="w-full table-fixed border-collapse">
      {/* Column widths, measured from the Figma (node I1:1483;448:4488):
          checkbox 76px, five data columns of 223.6px each, then a 92px View
          cell with 20px of trailing gutter — 76 + (5 x 223.6) + 112 = 1306.
          The five middle columns are left unsized so table-fixed splits the
          remainder equally, which reproduces 223.6px at the design width
          and degrades evenly on narrower screens. */}
        <colgroup>
          <col className="w-[76px]" />
          {COLUMNS.map((c) => (
            <col key={c} />
          ))}
          <col className="w-[112px]" />
        </colgroup>

        <thead>
          {/* opacity-30 on the whole header row is how the Figma dims it —
              one rule rather than a separate muted colour per cell. */}
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
                colSpan={COLUMNS.length + 2}
                className="px-[20px] py-[40px] text-center text-[14px] text-ink-muted"
              >
                No new logs. Everything has been reviewed.
              </td>
            </tr>
          ) : (
            logs.map((log) => (
              <tr key={log.id} className="h-[58px] hover:bg-selected">
                {/* The Figma sits the checkbox 56px in from the left of a
                    76px column, not centred in it. */}
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
                {/* py-[12px], not py-[20px]. The button is 34px tall, so 20px
                    of padding would make this cell 74px and drag the whole row
                    up with it — a <tr> height is a minimum, not a cap. 12 + 34
                    + 12 is the 58px the Figma specifies. */}
                <td className="py-[12px] pr-[20px]">
                  <button
                    type="button"
                    className="mx-auto flex items-center justify-center rounded-pill border border-hairline bg-surface px-[16px] py-[8px] text-[14px] text-ink-secondary drop-shadow-[0px_0px_2px_rgba(0,0,0,0.05)]"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
