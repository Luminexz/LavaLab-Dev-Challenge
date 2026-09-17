'use client';

import { useTransition } from 'react';
import { setLogReviewed, setManyReviewed } from '@/app/actions';

/**
 * The row checkbox from the Figma, given a meaning.
 *
 * Checked means the log has been reviewed. That reading was chosen over the
 * usual "select rows, then press an action button" because the action button
 * does not exist in the design — a selection toolbar would be new UI invented
 * on top of the mockup. A checkbox that directly reflects and sets read state
 * needs no extra chrome, reads the way an inbox does, and gives both
 * directions for free: unchecking marks a log unread again.
 *
 * The write is a Server Action, so the page re-renders from the database and
 * the stat cards and counts move with it.
 */

const BOX =
  'size-4 shrink-0 cursor-pointer appearance-none rounded-[2px] border border-ink-secondary ' +
  'bg-surface checked:border-ink checked:bg-ink disabled:cursor-wait disabled:opacity-40';

export function ReviewToggle({
  logId,
  reviewed,
  employeeName,
}: {
  logId: string;
  reviewed: boolean;
  employeeName: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <input
      type="checkbox"
      checked={reviewed}
      disabled={pending}
      aria-label={
        reviewed
          ? `Mark ${employeeName}'s log unread`
          : `Mark ${employeeName}'s log reviewed`
      }
      title={reviewed ? 'Reviewed — click to mark unread' : 'Mark as reviewed'}
      onChange={(event) => {
        const next = event.currentTarget.checked;
        startTransition(async () => {
          const data = new FormData();
          data.set('logId', logId);
          data.set('reviewed', String(next));
          await setLogReviewed(data);
        });
      }}
      className={BOX}
    />
  );
}

/**
 * The header checkbox: marks every listed log read, or unread.
 *
 * Indeterminate when only some are reviewed — set imperatively through a ref
 * callback because `indeterminate` is a DOM property with no HTML attribute,
 * so React cannot express it in JSX.
 */
export function ReviewAllToggle({
  logIds,
  reviewedCount,
}: {
  logIds: string[];
  reviewedCount: number;
}) {
  const [pending, startTransition] = useTransition();

  const total = logIds.length;
  const allReviewed = total > 0 && reviewedCount === total;
  const someReviewed = reviewedCount > 0 && reviewedCount < total;

  return (
    <input
      type="checkbox"
      checked={allReviewed}
      disabled={pending || total === 0}
      ref={(node) => {
        if (node) node.indeterminate = someReviewed;
      }}
      aria-label={allReviewed ? 'Mark all listed logs unread' : 'Mark all listed logs reviewed'}
      title={allReviewed ? 'Mark all unread' : 'Mark all reviewed'}
      onChange={() => {
        startTransition(async () => {
          const data = new FormData();
          data.set('logIds', JSON.stringify(logIds));
          data.set('reviewed', String(!allReviewed));
          await setManyReviewed(data);
        });
      }}
      className={BOX}
    />
  );
}
