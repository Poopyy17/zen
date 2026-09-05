/**
 * Resolves a tenant slug to its database name. Convention-based stand-in for
 * a real `platform.tenant_information` cross-tenant lookup — see
 * PROJECT_OUTLINE.md, "Multi-Tenant DB Connection Strategy". There's no
 * single shared registry yet (each tenant's own db self-describes only
 * itself), so this derives the name instead. Callers depend only on this
 * function's signature, so swapping it for a real lookup later doesn't
 * change anything upstream.
 */
export function resolveTenantDbName(tenantSlug: string): string {
  return `test-${tenantSlug}`;
}
