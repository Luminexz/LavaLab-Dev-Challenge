# toph

The Next.js application. See the [repository README](../README.md) for the stack rationale,
architecture decisions, database schema and setup instructions.

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Development server on http://localhost:3000 |
| `npm run build` | Production build |
| `npm run start` | Serve a production build |
| `npm run lint` | ESLint |
| `npm run db:types` | Regenerate `lib/types/database.ts` from the live schema (needs `SUPABASE_PROJECT_ID`) |

## Layout

```
app/
  page.tsx            Dashboard — Server Component, reads filters from the URL
  actions.ts          Server Actions: add/remove tag, mark reviewed
  globals.css         Design tokens extracted from the Figma
components/
  sidebar.tsx         Fixed navigation column
  stat-card.tsx       The three headline metrics
  logs-table.tsx      Log table, filter chips, expand/collapse
  expanded-entry.tsx  The panel that opens under a row
  recording-player.tsx  Waveform + audio playback (client)
  tag-editor.tsx      Add/remove tags (client)
  field-map.tsx       Leaflet wrapper, loaded with ssr: false
  field-map-inner.tsx Map itself: satellite tiles, field polygon, pin
lib/
  queries.ts          All dashboard reads, plus URL filter parsing
  format.ts           Date/time/activity display formatting
  url.ts              Builds filter links
  supabase/           Browser and server clients
  types/database.ts   Types mirroring the SQL schema
supabase/
  migrations/         Schema, RLS, and two views — run in filename order
  seed.sql            Demo data; truncates first, safe to re-run
```
