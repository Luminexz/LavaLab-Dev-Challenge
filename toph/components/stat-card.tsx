import type { LucideIcon } from 'lucide-react';

/**
 * One of the three cards across the top — Figma node I1:1483;448:4451.
 *
 * `flex-1` with `min-w-0` reproduces the Figma's `flex-[1_0_0]` + `min-w-px`:
 * three equal columns that share the row and are allowed to shrink. Without
 * min-w-0 a long label would force the card wider than its share, because a
 * flex item's default minimum size is its content.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  note,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  /** The "1 New" line beside the number. Hidden when there is nothing new. */
  note?: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[20px] rounded-card border-[0.88px] border-hairline p-[20px]">
      <div className="flex shrink-0 items-center gap-[8px]">
        <Icon className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
        <span className="whitespace-nowrap text-[16px] text-ink">{label}</span>
      </div>
      <div className="flex shrink-0 items-end gap-[20px] text-ink">
        <span className="text-[48px] font-medium leading-none">{value}</span>
        {note ? (
          <span className="pb-[2px] text-[14px] opacity-50">{note}</span>
        ) : null}
      </div>
    </div>
  );
}
