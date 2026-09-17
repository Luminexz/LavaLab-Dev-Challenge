export type RawParams = Record<string, string | string[] | undefined>;

/**
 * Build a dashboard URL from the current params plus a set of changes.
 * A `null` value removes that param.
 *
 * Every control on the page is a link built with this, which is what keeps the
 * whole dashboard a Server Component: changing a filter is a navigation, not a
 * state update plus a client-side fetch.
 */
export function hrefWith(current: RawParams, changes: Record<string, string | null>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(current)) {
    const single = Array.isArray(value) ? value[0] : value;
    if (single != null && single !== '') params.set(key, single);
  }

  for (const [key, value] of Object.entries(changes)) {
    if (value === null) params.delete(key);
    else params.set(key, value);
  }

  const query = params.toString();
  return query ? `/?${query}` : '/';
}
