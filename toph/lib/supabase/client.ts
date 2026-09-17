import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/types/database';

/**
 * Supabase client for Client Components.
 *
 * Uses the anon key, which is public by design — it ships in the JS bundle.
 * What stops it being a hole is row-level security (supabase/migrations/
 * 0002_rls.sql): the key identifies the `anon` role, and the policies decide
 * what that role may read or write.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
