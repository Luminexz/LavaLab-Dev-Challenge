-- Make the "1 New" badge clear once the log behind it has been read.
--
-- Until now "new" meant purely "arrived recently", so the subtitle under Todays
-- Recordings and the green count in the sidebar never moved no matter what the
-- owner opened. That is defensible as "what landed while I was out", but it is
-- not how a notification behaves: a badge you have dealt with should go away.
--
-- "New" now means recently arrived AND not yet reviewed. Opening that log — via
-- the View button, or by ticking its checkbox — drops the badge to zero, and
-- the sidebar pill disappears with it. Marking it unread brings both back.
--
-- Note what did NOT change: "New Employee Logs (n)" still counts every
-- unreviewed log. The two numbers stay different (1 vs 4, as the Figma shows)
-- because one is scoped to recent arrivals and the other is not. Collapsing
-- them into a single count is what would make the design's numbers contradict
-- each other.
--
-- The log_date = today restriction is gone as well. Voice logs sync when the
-- phone regains signal, so a recording made in a field two days ago can arrive
-- twenty minutes ago; it is still the newest thing the owner has not seen.

create or replace view dashboard_stats with (security_invoker = true) as
select
  f.id as farm_id,

  -- "Todays Recordings" — the most recent day this farm recorded anything.
  (select count(*) from logs l
    where l.farm_id = f.id
      and l.log_date = (select max(d.log_date) from logs d where d.farm_id = f.id))
    as todays_recordings,

  -- The "1 New" subtitle and the green badge in the sidebar: logs that arrived
  -- in the farm's most recent hour of activity and have not been reviewed.
  (select count(*) from logs l
    where l.farm_id = f.id
      and not l.is_reviewed
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
