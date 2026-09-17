-- Put the dashboard back to its "fresh" state, without reseeding.
--
-- Clicking through the app is destructive to the demo: opening a log marks it
-- read, so after a few minutes of testing the table is empty and the "1 New"
-- badge is gone. Re-running seed.sql fixes that but truncates everything, which
-- also clears audio_path and means re-running attach_audio.sql afterwards.
--
-- This file resets only the state the UI changes — what is read, and when the
-- newest recording arrived. Logs, employees, fields, tags and audio are all
-- left alone. Safe to run as often as you like; run it last, just before
-- sharing the link.

-- 1. Everything is read...
update logs set is_reviewed = true;

-- 2. ...except the four rows the Figma shows. Matched on activity + field and
--    taking the most recent of each, the same rule attach_audio.sql uses:
--    two people harvested FIELD B and two planted FIELD C, so employee alone
--    would not identify a single log.
update logs l
set is_reviewed = false
from (values
  ('spraying',   'FIELD A'),
  ('harvesting', 'FIELD B'),
  ('planting',   'FIELD C'),
  ('irrigation', 'FIELD D')
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

-- 3. Make Sophia Lee's irrigation log the farm's newest arrival again, so it is
--    unread AND recent — which is what the "1 New" subtitle and the green
--    sidebar badge count. Its log_date stays where it is: the recording was
--    made in the field days ago and only synced now, which is the ordinary case
--    for a phone that was out of signal.
update logs l
set created_at = now() - interval '20 minutes'
where l.id = (
  select inner_log.id
  from logs inner_log
  join fields f on f.id = inner_log.field_id
  where inner_log.activity = 'irrigation'
    and f.name = 'FIELD D'
  order by inner_log.log_date desc, inner_log.start_time desc
  limit 1
);

-- Confirm: 5 / 1 New / 12 / 90, four unreviewed, and audio still attached.
select
  (select todays_recordings from dashboard_stats) as todays_recordings,  -- 5
  (select new_today         from dashboard_stats) as new_badge,          -- 1
  (select active_workers    from dashboard_stats) as active_workers,     -- 12
  (select response_accuracy from dashboard_stats) as response_accuracy,  -- 90
  (select unreviewed_logs   from dashboard_stats) as new_employee_logs,  -- 4
  (select count(*) from logs where audio_path is null) as missing_audio; -- 0
