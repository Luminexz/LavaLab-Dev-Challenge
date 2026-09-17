-- Anchor "today" to the farm's most recent day of activity, not to current_date.
--
-- 0006 fixed the one-hour window behind the "1 New" badge but left the day
-- itself as current_date. Both "Todays Recordings" and "1 New" still only hold
-- on the calendar day the data was seeded: open the dashboard the next morning
-- and the first stat card reads 0 and the badge disappears, even though nothing
-- about the data changed.
--
-- Anchoring to max(log_date) asks "what happened on the most recent day this
-- farm recorded anything", which is stable whenever the page is opened. On a
-- farm that is actually logging work, the most recent day IS today and the two
-- definitions are the same query — this is not a demo-only special case, it is
-- the same question asked without assuming the data is live.
--
-- The alternative would be a cron job that rolls the seed forward each night.
-- That is more moving parts for a dashboard whose job is to describe the data
-- it has.

create or replace view dashboard_stats with (security_invoker = true) as
select
  f.id as farm_id,

  -- "Todays Recordings" — the most recent day this farm recorded anything.
  (select count(*) from logs l
    where l.farm_id = f.id
      and l.log_date = (select max(d.log_date) from logs d where d.farm_id = f.id))
    as todays_recordings,

  -- The "1 New" subtitle and the green badge in the sidebar: of that day's
  -- logs, the ones that arrived in its final hour of activity. Deliberately NOT
  -- the same as unreviewed — "just arrived" and "not yet dealt with" are
  -- different questions, and the design asks both in different places.
  (select count(*) from logs l
    where l.farm_id = f.id
      and l.log_date = (select max(d.log_date) from logs d where d.farm_id = f.id)
      and l.created_at > (
        select max(recent.created_at) from logs recent where recent.farm_id = f.id
      ) - interval '1 hour')
    as new_today,

  -- "Active Workers"
  (select count(*) from employees e
    where e.farm_id = f.id and e.is_active) as active_workers,

  -- "Response Accuracy" — mean transcription confidence as a whole percent.
  (select round(avg(l.transcription_confidence) * 100) from logs l
    where l.farm_id = f.id) as response_accuracy,

  -- Drives the "New Employee Logs (n)" heading.
  (select count(*) from logs l
    where l.farm_id = f.id and not l.is_reviewed) as unreviewed_logs

from farms f;

grant select on dashboard_stats to anon, authenticated;
