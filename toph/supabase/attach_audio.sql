-- Attach uploaded recordings to logs.
--
-- Run this AFTER uploading the clips to the `recordings` bucket, and after
-- seed.sql. It is separate from the seed on purpose: seeding a path for a file
-- that has not been uploaded would leave the Play button enabled and then fail
-- on click, which is worse than it being honestly disabled.
--
-- Paths are relative to the bucket root: no URL, no bucket prefix. Storage
-- object keys are CASE-SENSITIVE, so the capital I in the Isaac files matters.
--
-- Two passes:
--   1. The four clips whose spoken content matches a specific log get attached
--      to exactly that log.
--   2. Every remaining log gets one of the five clips, cycled, so no entry in
--      the table has a dead Play button. The audio will not match those
--      transcripts — it is stand-in content for a demo, and only the four
--      below are truthful pairings.

-- ---------------------------------------------------------------------------
-- 1. Exact matches
--
-- Matching is on activity + field, which is what the filenames encode. That is
-- more precise than employee + activity: two different people harvested FIELD B
-- and two planted FIELD C, so employee alone would not disambiguate. Taking the
-- most recent of each lands on the four unreviewed logs — the ones on screen.
-- ---------------------------------------------------------------------------

update logs l
set audio_path = v.path
from (values
  ('spraying',   'FIELD A', 'Isaac-spraying-a.m4a'),
  ('harvesting', 'FIELD B', 'maya-harvesting-b.m4a'),
  ('planting',   'FIELD C', 'liam-planting-c.m4a'),
  ('irrigation', 'FIELD D', 'sophia-irrigation-d.m4a')
) as v(activity, field, path)
where l.id = (
  select inner_log.id
  from logs inner_log
  join fields f on f.id = inner_log.field_id
  where inner_log.activity = v.activity::activity_type
    and f.name = v.field
  order by inner_log.log_date desc, inner_log.start_time desc
  limit 1
);

-- ---------------------------------------------------------------------------
-- 2. Everything else, cycled
--
-- Ordering by log_date then id makes the assignment deterministic: re-running
-- this file produces the same pairing rather than shuffling the audio around.
-- ---------------------------------------------------------------------------

with files as (
  select path, (row_number() over (order by path)) - 1 as idx
  from (values
    ('Isaac-fertilizing-a.m4a'),
    ('Isaac-spraying-a.m4a'),
    ('liam-planting-c.m4a'),
    ('maya-harvesting-b.m4a'),
    ('sophia-irrigation-d.m4a')
  ) as t(path)
),
targets as (
  select
    id,
    ((row_number() over (order by log_date desc, start_time desc, id)) - 1)
      % (select count(*) from files) as idx
  from logs
  where audio_path is null
)
update logs l
set audio_path = f.path
from targets t
join files f on f.idx = t.idx
where l.id = t.id;

-- Confirm: every log has a recording, and the four featured ones are truthful.
select
  count(*) filter (where audio_path is null) as logs_without_audio,  -- expect 0
  count(*)                                   as total_logs
from logs;

select e.full_name, l.activity, f.name as field, l.is_reviewed, l.audio_path
from logs l
join employees e on e.id = l.employee_id
join fields f on f.id = l.field_id
order by l.log_date desc, l.start_time desc;
