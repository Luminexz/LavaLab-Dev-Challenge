-- Row-level security.
--
-- RLS is enabled now, before auth exists, for two reasons:
--   1. The anon key ships to the browser. Without RLS, anyone who reads it from
--      the bundle gets full table access. "It's only a demo" is how that
--      becomes production.
--   2. Turning RLS on later changes app behaviour at the worst possible time.
--      Starting with it on means the pre-auth and post-auth apps behave alike.
--
-- Current posture: public read of one demo farm, tightly scoped writes.
-- When auth lands, each `using (true)` below becomes a membership check
-- against the signed-in user's farm — the table structure does not change,
-- because every table already carries farm_id.

alter table farms      enable row level security;
alter table employees  enable row level security;
alter table fields     enable row level security;
alter table chemicals  enable row level security;
alter table logs       enable row level security;
alter table tags       enable row level security;
alter table log_tags   enable row level security;

-- --- Read -------------------------------------------------------------------

create policy "public read farms"     on farms     for select to anon, authenticated using (true);
create policy "public read employees" on employees for select to anon, authenticated using (true);
create policy "public read fields"    on fields    for select to anon, authenticated using (true);
create policy "public read chemicals" on chemicals for select to anon, authenticated using (true);
create policy "public read logs"      on logs      for select to anon, authenticated using (true);
create policy "public read tags"      on tags      for select to anon, authenticated using (true);
create policy "public read log_tags"  on log_tags  for select to anon, authenticated using (true);

-- --- Write ------------------------------------------------------------------
-- The dashboard writes in exactly three places: create a tag, attach a tag to
-- a log, and mark a log reviewed. Nothing else is grantable from the browser.

create policy "create tags"   on tags     for insert to anon, authenticated with check (true);
create policy "attach tags"   on log_tags for insert to anon, authenticated with check (true);
create policy "detach tags"   on log_tags for delete to anon, authenticated using (true);
create policy "review logs"   on logs     for update to anon, authenticated using (true) with check (true);

-- RLS controls which ROWS are visible; it cannot restrict which COLUMNS are
-- writable. Column-level grants do that. Marking a log reviewed is the only
-- edit the dashboard makes, so that is the only column it may write —
-- a compromised client cannot rewrite a transcript or reassign a log.
revoke update on logs from anon, authenticated;
grant  update (is_reviewed) on logs to anon, authenticated;

-- Logs and reference data are written by the mobile ingest pipeline using the
-- service-role key, which bypasses RLS by design. No browser-facing insert
-- policy on logs is intentional.
