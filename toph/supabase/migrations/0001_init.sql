-- Toph — initial schema
-- Farm work logs captured as voice recordings in the mobile app, transcribed,
-- and reviewed by farm owners in this dashboard.

-- gen_random_uuid() is core Postgres since v13, so no pgcrypto extension
-- is required here.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- The set of loggable activities is small and closed, so an enum gives us
-- type safety all the way into TypeScript. A lookup table would buy
-- user-defined activities, which the product does not offer.
create type activity_type as enum (
  'spraying',
  'harvesting',
  'planting',
  'irrigation',
  'fertilizing',
  'scouting',
  'tilling',
  'maintenance'
);

-- ---------------------------------------------------------------------------
-- Tenancy root
-- ---------------------------------------------------------------------------

-- Every other table hangs off a farm. There is one farm today, but carrying
-- farm_id everywhere is what lets row-level security become a one-line policy
-- per table when auth lands, rather than a schema migration.
create table farms (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

create table employees (
  id          uuid primary key default gen_random_uuid(),
  farm_id     uuid not null references farms(id) on delete cascade,
  full_name   text not null,
  role        text not null default 'Field Worker',
  avatar_url  text,
  -- Drives the "Active Workers" stat card. Workers are deactivated, never
  -- deleted, so their historical logs keep a valid foreign key.
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index employees_farm_idx on employees (farm_id);

-- ---------------------------------------------------------------------------
-- Land
-- ---------------------------------------------------------------------------

create table fields (
  id          uuid primary key default gen_random_uuid(),
  farm_id     uuid not null references farms(id) on delete cascade,
  name        text not null,
  -- GeoJSON Polygon coordinates: [[[lng, lat], ...]]. Stored as jsonb rather
  -- than PostGIS because the dashboard only ever draws the outline — it never
  -- asks spatial questions like "which field contains this point?". PostGIS
  -- is the right upgrade the moment we need containment or acreage queries.
  boundary    jsonb not null,
  -- Denormalised centroid for the map pin, so the client does not have to
  -- compute one on every render.
  center_lat  double precision not null,
  center_lng  double precision not null,
  created_at  timestamptz not null default now(),
  unique (farm_id, name)
);

create index fields_farm_idx on fields (farm_id);

-- ---------------------------------------------------------------------------
-- Inputs
-- ---------------------------------------------------------------------------

-- The Figma table has no chemical column, but the product description says the
-- most common log is "which chemical was applied to which field". Modelling it
-- now keeps that data queryable (and it shows up in the expanded summary)
-- instead of being trapped in free-text transcripts.
create table chemicals (
  id           uuid primary key default gen_random_uuid(),
  farm_id      uuid not null references farms(id) on delete cascade,
  name         text not null,
  -- e.g. 'herbicide', 'fungicide', 'fertilizer'
  category     text,
  -- Regulated re-entry interval in hours; compliance reporting needs it.
  rei_hours    integer,
  created_at   timestamptz not null default now(),
  unique (farm_id, name)
);

create index chemicals_farm_idx on chemicals (farm_id);

-- ---------------------------------------------------------------------------
-- The core record
-- ---------------------------------------------------------------------------

create table logs (
  id           uuid primary key default gen_random_uuid(),
  farm_id      uuid not null references farms(id) on delete cascade,
  employee_id  uuid not null references employees(id) on delete restrict,
  field_id     uuid not null references fields(id) on delete restrict,
  activity     activity_type not null,
  chemical_id  uuid references chemicals(id) on delete set null,

  -- Date and clock times are stored separately, not as two timestamptz values.
  -- Farm shifts are wall-clock local concepts ("6:00 AM - 10:40 AM on the
  -- 19th"); storing them as instants would drag timezone conversion into every
  -- read for no benefit.
  log_date     date not null,
  start_time   time not null,
  end_time     time not null,

  -- Voice pipeline output.
  audio_url                 text,
  audio_duration_seconds    integer,
  transcript                text,
  summary                   text,
  -- 0..1 confidence from transcription. The "Response Accuracy" stat card is
  -- avg(transcription_confidence), so that number is measured, not typed in.
  transcription_confidence  numeric(4,3) check (transcription_confidence between 0 and 1),

  -- Owner has opened this log. Drives the "New Employee Logs (n)" table.
  -- Deliberately separate from created_at recency, which drives the "1 New"
  -- badge — one is "have I dealt with it", the other is "did it just arrive".
  is_reviewed  boolean not null default false,

  created_at   timestamptz not null default now(),

  constraint logs_time_order check (end_time > start_time)
);

-- The dashboard's main query is "this farm's logs, newest first", and the
-- filters narrow by date. This index serves both.
create index logs_farm_date_idx on logs (farm_id, log_date desc, start_time desc);
create index logs_employee_idx  on logs (employee_id);
create index logs_field_idx     on logs (field_id);
create index logs_unreviewed_idx on logs (farm_id) where not is_reviewed;

-- ---------------------------------------------------------------------------
-- Tags  ("Add Tag" in the expanded entry)
-- ---------------------------------------------------------------------------

-- Tags are their own table rather than a text[] column on logs so that the
-- same tag is one row: renaming it, counting its uses, or listing every
-- distinct tag for an autocomplete are all cheap.
create table tags (
  id          uuid primary key default gen_random_uuid(),
  farm_id     uuid not null references farms(id) on delete cascade,
  label       text not null,
  created_at  timestamptz not null default now(),
  unique (farm_id, label)
);

create table log_tags (
  log_id      uuid not null references logs(id) on delete cascade,
  tag_id      uuid not null references tags(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (log_id, tag_id)
);

create index log_tags_tag_idx on log_tags (tag_id);
