-- Store the recording's object path, not a fully-qualified URL.
--
-- A full URL bakes the Supabase project ref into every row. Point the app at a
-- different project — a teammate's, a staging one, a restored backup — and
-- every stored URL still resolves to the old project, or to nothing. The rows
-- would have to be rewritten as part of the migration.
--
-- The path is the stable fact ("which object is this"); the host is deployment
-- configuration, which already lives in NEXT_PUBLIC_SUPABASE_URL. The client
-- joins the two at read time via storage.getPublicUrl().
--
-- Paths are relative to the bucket named in lib/storage.ts, e.g.
-- 'isaac-wang-spraying.m4a' inside the 'recordings' bucket.

alter table logs rename column audio_url to audio_path;

comment on column logs.audio_path is
  'Object path within the recordings storage bucket, relative to the bucket '
  'root. Not a URL — the host comes from the client''s Supabase config.';

-- Renaming a column does not rename it in a view that already selected it, so
-- log_rows would keep publishing a column called audio_url. Recreate it.
drop view log_rows;

create view log_rows with (security_invoker = true) as
select
  l.id,
  l.farm_id,
  e.full_name            as employee_name,
  l.activity,
  l.activity::text       as activity_text,
  l.log_date,
  f.name                 as field_name,
  l.start_time,
  l.end_time,
  l.is_reviewed,
  l.created_at,
  l.transcript,
  l.summary,
  l.audio_path,
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
