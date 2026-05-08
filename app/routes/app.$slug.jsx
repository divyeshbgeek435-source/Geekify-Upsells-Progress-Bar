import { redirect } from "react-router";

/**
 * Safety net for malformed `/app/<slug>` paths (e.g. `/app/&`).
 * Redirect back to `/app` so the embedded app recovers gracefully.
 */
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  throw redirect(qs ? `/app?${qs}` : "/app");
};

