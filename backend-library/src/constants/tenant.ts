/**
 * Header carrying the subdomain-detected tenant slug from `web` (see
 * `web/src/proxy.ts`) through `gateway` to `core-service`, where it drives
 * per-request tenant DB resolution (`tenant-middleware`'s
 * `resolveTenantDbName`). A shared wire contract, same category as
 * `LoginDto`.
 */
export const TENANT_SLUG_HEADER = "x-tenant-slug";
