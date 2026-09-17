-- The three stat cards, computed in the database.
--
-- The alternative was to select every log into Node and average the confidence
-- column there. That works at 23 rows and falls over at 23,000 — it drags the
-- whole table across the wire to produce one number. Postgres already has the
-- aggregates; this view just asks for them, and turns three round trips plus a
-- full-table fetch into a single indexed query.
--
-- security_invoker = true makes the view run as the CALLER, so the row-level
-- security policies on the underlying tables still apply. Without it a view
-- runs as its owner and quietly becomes a way around RLS — the single most
-- common way a Supabase project leaks data.
create view dashboard_stats with (security_invoker = true) as
select
  f.id as farm_id,

  -- "Todays Recordings"
  (select count(*) from logs l
    where l.farm_id = f.id and l.log_date = current_date) as todays_recordings,

  -- The "1 New" subtitle, and the green badge in the sidebar: logs that landed
  -- within the last hour. This is deliberately NOT the same as unreviewed —
  -- "just arrived" and "not yet dealt with" are different questions, and the
  -- design asks both in different places.
  (select count(*) from logs l
    where l.farm_id = f.id
      and l.log_date = current_date
      and l.created_at > now() - interval '1 hour') as new_today,

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
