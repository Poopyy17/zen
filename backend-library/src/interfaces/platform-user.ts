import type { PlatformRole } from '../enums/platform-roles.js';

/**
 * Soft-delete status shared across platform-level entities — see
 * PROJECT_OUTLINE.md, "Cross-Service Data Consistency".
 */
export type PlatformEntityStatus = 'ACTIVE' | 'DELETED';

/**
 * Shape of a `platform.user` document — credentials only. See
 * PROJECT_OUTLINE.md, "Platform Operators (Super Admin)". Defined here as a
 * plain interface, not a Mongoose schema — schemas stay in the owning
 * service (`core-service`); `backend-library` is explicitly barred from
 * importing mongoose (see PROJECT_OUTLINE.md, "Enforcing Coding Rules
 * Before Merge"). This lets any service know the shape without depending
 * on Mongoose.
 */
export interface PlatformUser {
  id: string;
  email: string;
  passwordHash: string;
  isAdmin: boolean;
  status: PlatformEntityStatus;
}

/**
 * Shape of a `platform.admin_users` document — privilege only, no
 * credentials (those live on `PlatformUser`). `userId` references
 * `PlatformUser.id`.
 */
export interface PlatformAdminUser {
  id: string;
  userId: string;
  role: PlatformRole;
  status: PlatformEntityStatus;
}
