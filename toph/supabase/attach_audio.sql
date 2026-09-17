-- Attach uploaded recordings to logs, and make the text match what you hear.
--
-- Run this AFTER uploading the clips to the `recordings` bucket, and after
-- seed.sql. It is separate from the seed on purpose: seeding a path for a file
-- that has not been uploaded would leave the Play button enabled and then fail
-- on click, which is worse than it being honestly disabled.
--
-- Paths are relative to the bucket root: no URL, no bucket prefix. Storage
-- object keys are CASE-SENSITIVE, so the capital I in the Isaac files matters.
--
-- Three passes:
--   1. The four clips whose spoken content matches a specific log get attached
--      to exactly that log.
--   2. Every remaining log gets one of the five clips, cycled, so no entry in
--      the table has a dead Play button.
--   3. Each log's transcript and summary are rewritten to match the clip it
--      ended up with, so the text on screen is what the audio actually says.
--      There are only five recordings and twenty-three logs, so most rows show
--      borrowed content — that is the honest cost of a demo with five clips,
--      and it beats reading one thing while hearing another.

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
  ('spraying',    'FIELD A', 'Isaac-spraying-a.m4a'),
  ('harvesting',  'FIELD B', 'maya-harvesting-b.m4a'),
  ('planting',    'FIELD C', 'liam-planting-c.m4a'),
  ('irrigation',  'FIELD D', 'sophia-irrigation-d.m4a'),
  ('fertilizing', 'FIELD A', 'Isaac-fertilizing-a.m4a')
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

-- ---------------------------------------------------------------------------
-- 3. Make the text match the audio
--
-- One canonical transcript and summary per clip. Every log carrying that clip
-- gets that text, so opening any row and pressing play gives you words that
-- match the page. For the four logs from pass 1 this is a no-op — they already
-- had the matching text — which keeps a single source of truth for all of them.
-- ---------------------------------------------------------------------------

update logs l
set transcript = v.transcript,
    summary = v.summary
from (values
  (
    'Isaac-spraying-a.m4a',
    'Morning, uh, this is Isaac. Just finished up spraying on Field A. Started around six, wrapped up about ten forty. We ran the Roundup PowerMax, about, uh, thirty-two ounces per acre across roughly forty acres. Wind was light, maybe four, five miles an hour out of the northwest, so no drift issues. Tank mix was fine. One thing, the left boom nozzle was clogging up on me around the second pass, I cleared it but somebody should look at it before the next run.',
    'Applied Roundup PowerMAX to Field A at 32 oz/acre across roughly 40 acres. Light northwest wind, no drift. Left boom nozzle clogged on the second pass - cleared, but it should be checked before the next run.'
  ),
  (
    'maya-harvesting-b.m4a',
    'Hey, this is Maya. Harvesting on Field B today, seven thirty to about eleven fifteen. We got through, uh, I want to say twenty-two acres? Moisture was reading around fourteen percent, so, pretty good. Yield looked strong on the north end, kind of thin down by the ditch where it flooded last month. Two loads went out to the elevator. No equipment issues, combine ran clean all morning.',
    'Harvested about 22 acres of Field B at roughly 14% moisture. Yield strong on the north end, thin near the ditch that flooded last month. Two loads to the elevator; combine ran clean.'
  ),
  (
    'liam-planting-c.m4a',
    'This is Liam. Uh, planting Field C, started eight, finished right about noon. Corn, we''re at thirty-four thousand seeds per acre, thirty inch rows. Soil temp was fifty-five, fifty-six degrees so, good to go. Put down starter fertilizer with it, ten thirty-four zero, five gallons an acre. Got through about thirty acres. There''s a wet spot in the southeast corner I skipped, I''ll come back to it once it dries out.',
    'Planted about 30 acres of Field C in corn at 34,000 seeds/acre on 30 in rows. Soil temp 55-56F. Starter fertilizer 10-34-0 at 5 gal/acre. Wet spot in the southeast corner skipped until it dries.'
  ),
  (
    'sophia-irrigation-d.m4a',
    'Sophia here. Ran irrigation on Field D this morning, six thirty to nine thirty. Pivot went, uh, three-quarters of the way around, put down about point eight inches. Pressure was holding at forty-five PSI most of the time but it dipped a little on the back stretch. Oh, and there''s a leak at, I think tower four? It''s not bad yet but it''s gonna need a gasket. Everything else looked okay.',
    'Irrigated Field D, pivot three-quarters around, applying about 0.8 in. Pressure held near 45 PSI with a dip on the back stretch. Leak at tower four needs a gasket - not urgent yet.'
  ),
  (
    'Isaac-fertilizing-a.m4a',
    'Uh, Isaac again, afternoon log. Side-dressed Field A with, uh, thirty-two percent UAN, about, let''s see, a hundred and forty pounds of nitrogen per acre. Started one o''clock, done around three twenty. Covered the whole forty acres. Uh, what else, the applicator tank ran dry near the end so I had to go refill, that put me behind maybe twenty minutes. That''s it.',
    'Side-dressed Field A with 32% UAN at about 140 lb N/acre across the full 40 acres. Applicator tank ran dry near the end; refill cost roughly 20 minutes.'
  )
) as v(path, transcript, summary)
where l.audio_path = v.path;

-- Confirm: every log has a recording, and its text matches that recording.
select
  count(*) filter (where audio_path is null) as logs_without_audio,   -- expect 0
  count(*) filter (where summary is null)    as logs_without_summary, -- expect 0
  count(*)                                   as total_logs            -- expect 23
from logs;

select audio_path, count(*) as logs, min(left(summary, 45)) as summary_shown
from logs
group by audio_path
order by audio_path;
