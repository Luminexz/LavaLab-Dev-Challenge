import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/types/database';

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * The dashboard's first paint is a server render, so the initial log query runs
 * here — the browser receives rendered HTML rather than a loading spinner
 * followed by a fetch waterfall.
 *
 * `cookies()` is async in this version of Next, hence the await. The cookie
 * bridge is what lets a Supabase auth session survive a page navigation; it
 * does nothing yet but is required for the auth phase to be a drop-in.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot set cookies. Safe to ignore when
            // middleware is refreshing the session, which is the setup we
            // move to once auth exists.
          }
        },
      },
    },
  );
}
