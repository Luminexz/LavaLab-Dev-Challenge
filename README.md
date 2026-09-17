# Toph — Farm Activity Dashboard

A working implementation of the Toph desktop dashboard for the LavaLab Fall 2026 Dev Challenge.

**Live:** https://lava-lab-dev-challenge.vercel.app
**Design:** [Figma file](https://www.figma.com/design/HAbZdn2mzPMj9uct0fswEY/F26-Dev-Challenge-Figma--Copy-?node-id=0-1)
**App code:** [`toph/`](toph/)

---

## The product

Toph is software farmers use to log work done on their land — most often which chemical went on
which field. Farm workers record hands-free voice logs on a mobile app; Toph transcribes them and
extracts the details. **This project is the desktop dashboard** a farm owner uses to review what
their crew logged.

Everything on the page is read from Postgres. Refresh it, change the filters, add a tag — the state
is real and it persists.

---

## Stack, and why

| Choice | Reason |
| --- | --- |
| **TypeScript** | One typed language across UI and data layer. Types generated from the database schema mean a renamed column is a compile error, not a runtime `undefined`. |
| **Next.js 16 (App Router)** | Server Components let the dashboard query Postgres *during* the render, so the browser receives finished HTML instead of an empty table plus a fetch waterfall. Server Actions handle writes without hand-rolling API routes. |
| **Tailwind CSS v4** | The Figma publishes exactly one design variable; every other value is a raw hex on a layer. A utility framework let me name each extracted value once in an `@theme` block and use it directly, rather than fighting a prebuilt component theme's defaults. |
| **Supabase (Postgres)** | The data is unambiguously relational — farms have employees and fields, fields have logs, logs have tags. Postgres also gives row-level security, which is what makes the public browser key safe to ship. |
| **Leaflet + Esri imagery** | Draws each field's real boundary over satellite tiles. Esri World Imagery needs no API key or billing account, so the project keeps working after handover. Mapbox would look marginally better and would require a token in the client bundle. |
| **Vercel** | First-party Next.js hosting; every push gets a preview deployment. |

Versions: Next 16.3.5, React 19.2.8, Tailwind 4, `@supabase/supabase-js` 2.116, Leaflet 1.9 /
react-leaflet 5, `lucide-react` 1.47.

---

## Decisions worth explaining

### Filter state lives in the URL, not in React

Search, sorting, both filter chips and which row is expanded are all query parameters.

- The brief asks that a refresh keep working. A URL survives a refresh; `useState` does not.
- It keeps the page a Server Component — changing a filter re-runs the SQL rather than shipping a
  filtering implementation to the browser.
- Any view of the dashboard is a link you can send to someone.

Search is a plain `GET` form, so it works with JavaScript disabled.

### A database view for the log table

`log_rows` ([0004](toph/supabase/migrations/0004_log_rows.sql)) joins logs to employees, fields and
chemicals and exposes them flat.

PostgREST can embed related tables, but a filter on an embedded resource narrows *the embed*, not the
parent — and there is no way to express "employee name **or** field name **or** activity matches this
text" across two different embedded tables. Without the view, search would have to happen in Node
over already-fetched rows, which stops being correct as soon as the result set exceeds one page.
Joining once in the database turns every interaction into an ordinary filter on a single relation.

### Stat cards are computed in Postgres

`dashboard_stats` ([0003](toph/supabase/migrations/0003_dashboard_stats.sql)) returns the four
headline numbers as one row. The alternative — selecting every log into Node to average a column —
works at 23 rows and falls over at 23,000.

Both views are declared `security_invoker = true` so they run as the caller and row-level security
still applies. A view without that flag runs as its owner and silently becomes an RLS bypass.

### Row-level security from the first migration

RLS is enabled in [0002](toph/supabase/migrations/0002_rls.sql), before authentication exists, for
two reasons: the anon key ships in the JavaScript bundle and is public by design, and turning RLS on
later changes application behaviour at the worst possible moment.

The browser's write surface is deliberately tiny — create a tag, attach or detach a tag, and mark a
log reviewed. That last one is enforced with a **column-level grant**, not just a policy:

```sql
revoke update on logs from anon, authenticated;
grant  update (is_reviewed) on logs to anon, authenticated;
```

RLS controls which *rows* are visible; it cannot restrict which *columns* are writable. A compromised
client cannot rewrite a transcript or reassign a log to a different worker.

### Two different meanings of "new"

The design asks two questions that look alike. `is_reviewed` drives the **New Employee Logs** table;
recency of `created_at` drives the **1 New** badge and the sidebar count. Collapsing them into one
flag is why those numbers would contradict each other.

---

## Database schema

```
farms ──┬── employees ──┐
        ├── fields ─────┼── logs ──── log_tags ──── tags
        └── chemicals ──┘
```

| Table | Notes |
| --- | --- |
| `farms` | Tenancy root. Every table carries `farm_id`, so RLS becomes a membership check rather than a migration when auth lands. |
| `employees` | Deactivated, never deleted, so historical logs keep a valid foreign key. |
| `fields` | Boundary stored as GeoJSON in `jsonb`, not PostGIS — the dashboard draws outlines, it never asks spatial questions. PostGIS is the right upgrade the moment containment or acreage queries appear. |
| `chemicals` | Not in the Figma, but the product description says chemical application is the core use case. Includes `rei_hours`, the regulated re-entry interval a compliance audit asks about. |
| `logs` | Date and clock times stored separately rather than as two timestamps — farm shifts are wall-clock concepts, and storing them as instants drags timezone conversion into every read. |
| `tags` / `log_tags` | Tags are rows, not a `text[]`, so renaming one or counting its uses is cheap. |

`activity` is a Postgres enum: the set is small and closed, and it generates a TypeScript union type.

---

## Features

- Stat cards computed live from the database
- Search across employee, activity and field
- Sort by date (either direction) or employee
- Removable **This Month** filter and a **Filter** toggle between new and all logs
- Expand a row for the recording, transcript summary and a satellite map of the field
- Waveform player with click-to-seek
- Add and remove tags, persisted through Server Actions

### Design fidelity

Spacing, colours, radii and type were measured out of the Figma rather than eyeballed — the table
rows are 58px with 223.6px columns, the shell is capped at the design's 1676px canvas, and the map
highlight uses the sampled `#0065f0` outline and `#0175f0 → #00c3f0` pin gradient.

Two deliberate departures:

- The log table is a real `<table>`, not the Figma's nested flex rows, so screen readers can announce
  row and column position. `table-fixed` reproduces the equal-width columns.
- Icons come from `lucide-react`. Every icon layer in the Figma is named for a Lucide glyph
  (`chart-line`, `audio-lines`, `book-check`…), so the designer drew from that set.

The six fields are **real parcels near San Joaquin, California**, traced off satellite imagery — each
polygon follows the actual road and field edges, running 36 to 164 acres.

---

## Running locally

```bash
git clone <this repo>
cd toph
npm install
cp .env.local.example .env.local   # fill in from Supabase → Project Settings → API
npm run dev
```

Then, in the Supabase SQL editor, run in order:

```
supabase/migrations/0001_init.sql
supabase/migrations/0002_rls.sql
supabase/migrations/0003_dashboard_stats.sql
supabase/migrations/0004_log_rows.sql
supabase/migrations/0005_audio_path.sql
supabase/seed.sql
```

### Recordings

`logs.audio_path` stores an object path inside a public Storage bucket named
`recordings` — not a URL. A full URL would bake the Supabase project ref into every row, so pointing
the app at a different project would leave every link resolving to the old one. The path is the
stable fact; the host comes from `NEXT_PUBLIC_SUPABASE_URL` and the two are joined at read time.

To attach audio: create the bucket, upload clips named as listed in
[`supabase/attach_audio.sql`](toph/supabase/attach_audio.sql), then run that file. Logs without a
recording render the player disabled rather than broken.

`seed.sql` truncates first, so it is safe to re-run. It dates several logs relative to the day it
runs, so re-running it refreshes the demo data.

Deploying to Vercel: set **Root Directory** to `toph` and add the two `NEXT_PUBLIC_SUPABASE_*`
variables. `NEXT_PUBLIC_SUPABASE_URL` is the bare project URL (`https://<ref>.supabase.co`) — not the
REST endpoint.

---

## Known limitations

Things I would do next, in order:

- **Waveform bars are generated from the log id**, not from real amplitude data. They are
  deterministic, so a given log always draws the same shape. A real implementation would compute peak
  data at ingest and store it alongside the audio.
- **No authentication.** The schema and policies are built for it — every table carries `farm_id` and
  RLS is already on — so this is a policy change, not a migration.
- **Only the Dashboard is implemented.** The other sidebar items are navigation the challenge does
  not scope; they are intentionally inert rather than linking to empty pages.
- **The Figma dates its sample logs April 2026.** They are seeded relative to today instead, because
  the *This Month* chip is a real filter and April dates would correctly match nothing and hide every
  row. Employees, fields, activities and times are exactly as designed.
