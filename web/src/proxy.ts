import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Subdomain-based tenant detection, per PROJECT_OUTLINE.md's "Tenant
 * resolution at the gateway: subdomain-based" — `*.localhost` resolves to
 * loopback automatically in dev, no /etc/hosts changes needed.
 *
 * Named `proxy` (not `middleware`) — Next.js 16 renamed the file convention
 * and export name; `middleware.ts` no longer runs.
 *
 * Only extracts the slug and forwards it as a header for now — looking it
 * up against `tenant_information` (does this tenant actually exist?) is
 * separate follow-up work, not needed yet since no tenant-scoped feature
 * reads this header.
 */
export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const hostname = host.split(":")[0];
  const tenantSlug = hostname.endsWith(".localhost") ? hostname.slice(0, -".localhost".length) : null;

  const requestHeaders = new Headers(request.headers);
  if (tenantSlug) {
    requestHeaders.set("x-tenant-slug", tenantSlug);
  } else {
    requestHeaders.delete("x-tenant-slug");
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
