-- Put the dashboard back to its "fresh" state, without reseeding.
--
-- Clicking through the app is destructive to the demo: opening a log marks it
-- read, so after a few minutes of testing the table is empty and the "1 New"
-- badge is gone. Re-running seed.sql fixes that but truncates everything, which
-- also clears audio_path and the matched transcripts, meaning attach_audio.sql
-- has to be re-run afterwards.
--
-- This file resets only the state the UI changes — what is read, and when the
-- newest recording arrived. Logs, employees, fields, tags, audio and
-- transcripts are all left alone. Safe to run as often as you like; run it
-- last, just before sharing the link.

-- 1. Everything is read...
update logs set is_reviewed = true;

-- 2. ...except the five that should be waiting: the four rows from the Figma,
--    plus Isaac's fertilizing log from today, which is the new arrival.
--
--    Matched on activity + field, taking the most recent of each — the same
--    rule attach_audio.sql uses. Two people harvested FIELD B and two planted
--    FIELD C, so employee alone would not identify a single log.
update logs l
set is_reviewed = false
from (values
  ('spraying',    'FIELD A'),
  ('harvesting',  'FIELD B'),
  ('planting',    'FIELD C'),
  ('irrigation',  'FIELD D'),
  ('fertilizing', 'FIELD A')
) as v(activity, field)
where l.id = (
  select inner_log.id
  from logs inner_log
  join fields f on f.id = inner_log.field_id
  where inner_log.activity = v.activity::activity_type
    and f.name = v.field
  order by inner_log.log_date desc, inner_log.start_time desc
  limit 1
);

-- 3. Make Isaac's fertilizing log the farm's newest arrival again, so it is
--    both unread and recent — which is what the "1 New" subtitle and the green
--    sidebar badge count. It is dated today, so it also sits inside the five
--    the "Todays Recordings" card is counting.
update logs l
set created_at = now() - interval '20 minutes'
where l.id = (
  select inner_log.id
  from logs inner_log
  join fields f on f.id = inner_log.field_id
  where inner_log.activity = 'fertilizing'
    and f.name = 'FIELD A'
  order by inner_log.log_date desc, inner_log.start_time desc
  limit 1
);

-- Confirm: 5 / 1 New / 12 / 90, five unread rows, audio and text intact.
select
  (select todays_recordings from dashboard_stats) as todays_recordings,  -- 5
  (select new_today         from dashboard_stats) as new_badge,          -- 1
  (select active_workers    from dashboard_stats) as active_workers,     -- 12
  (select response_accuracy from dashboard_stats) as response_accuracy,  -- 90
  (select unreviewed_logs   from dashboard_stats) as new_employee_logs,  -- 5
  (select count(*) from logs where audio_path is null) as missing_audio; -- 0
