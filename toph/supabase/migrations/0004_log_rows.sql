-- A flat, queryable shape for the dashboard table.
--
-- Why a view rather than embedded joins from the client:
--
--   PostgREST can embed related tables (`logs?select=*,employees(full_name)`),
--   but a filter on an embedded resource narrows the EMBED, not the parent —
--   and there is no way to write "employee name OR field name OR activity
--   matches this text" across two different embedded tables. Search would have
--   had to happen in Node, over rows already fetched, which stops being
--   correct the moment the result set is larger than the page.
--
--   Joining once here turns every dashboard interaction — search, sort, the
--   date and month chips — into ordinary filters on a single relation, which
--   is exactly what PostgREST is good at. The planner still uses the indexes
--   on the underlying tables.
--
-- security_invoker = true so row-level security on logs/employees/fields still
-- applies to whoever selects from this.
create view log_rows with (security_invoker = true) as
select
  l.id,
  l.farm_id,
  e.full_name            as employee_name,
  l.activity,
  -- The enum rendered as text, so `ilike` can search it. Filtering an enum
  -- column with a pattern requires a cast; doing it once here keeps the cast
  -- out of every query.
  l.activity::text       as activity_text,
  l.log_date,
  f.name                 as field_name,
  l.start_time,
  l.end_time,
  l.is_reviewed,
  l.created_at,
  l.transcript,
  l.summary,
  l.audio_url,
  l.audio_duration_seconds,
  l.transcription_confidence,
  c.name                 as chemical_name,
  c.rei_hours            as chemical_rei_hours,
  f.center_lat,
  f.center_lng,
  f.boundary
from logs l
join employees e on e.id = l.employee_id
join fields f    on f.id = l.field_id
left join chemicals c on c.id = l.chemical_id;

grant select on log_rows to anon, authenticated;
