-- Anchor the "1 New" badge to the newest recording rather than to wall-clock now().
--
-- The original definition was `created_at > now() - interval '1 hour'`, which is
-- the right rule for a live farm: it answers "what landed while I was away".
--
-- It is the wrong rule for seeded data. The seed writes its newest log 40
-- minutes in the past, so the badge reads 1 for roughly twenty minutes after
-- seeding and 0 for the rest of time — taking the stat card's "1 New" subtitle
-- and the green "1" in the sidebar with it. Both are visible elements of the
-- design, so a reviewer opening the app a day later sees neither.
--
-- Anchoring the window to max(created_at) instead asks "what arrived in the
-- most recent hour of activity on this farm", which is stable whenever the page
-- is opened. On a farm that is actually recording, max(created_at) tracks now()
-- and the two definitions converge.

create or replace view dashboard_stats with (security_invoker = true) as
select
  f.id as farm_id,

  -- "Todays Recordings"
  (select count(*) from logs l
    where l.farm_id = f.id and l.log_date = current_date) as todays_recordings,

  -- The "1 New" subtitle, and the green badge in the sidebar. Deliberately NOT
  -- the same as unreviewed — "just arrived" and "not yet dealt with" are
  -- different questions, and the design asks both in different places.
  (select count(*) from logs l
    where l.farm_id = f.id
      and l.log_date = current_date
      and l.created_at > (
        select max(recent.created_at) from logs recent where recent.farm_id = f.id
      ) - interval '1 hour') as new_today,

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
