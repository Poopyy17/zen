/**
 * Roles for platform operators — accounts that manage the platform itself
 * (tenants), not a specific tenant's business data. Credentials live in
 * `platform.user` (email/passwordHash); `platform.admin_users` links a
 * `userId` to one of these roles and is only consulted when that user's
 * `isAdmin` flag is set. Separate from the tenant-scoped Permission Matrix in
 * permission-matrix.ts, which governs `core.users` within a tenant instead.
 */
export enum PlatformRole {
  SuperAdmin = "super_admin",
}
