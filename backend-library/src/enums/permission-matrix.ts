/**
 * Canonical catalog of permission Modules and Actions, shared by every service.
 * Role -> permission assignments are tenant-specific data (core.roles),
 * not defined here — see PROJECT_OUTLINE.md — Permission Matrix (RBAC).
 */
export enum Module {
  DailyReport = "DailyReport",
  Staff = "Staff",
  Case = "Case",
}

export enum Action {
  Manage = "Manage",
  View = "View",
  Edit = "Edit",
  Delete = "Delete",
}

export interface PermissionGrant {
  module: Module;
  actions: Action[];
}

/**
 * `Manage` is a superset of View/Edit/Delete for a given module.
 */
export function hasPermission(grants: PermissionGrant[], module: Module, action: Action): boolean {
  const grant = grants.find((g) => g.module === module);
  if (!grant) return false;
  return grant.actions.includes(action) || grant.actions.includes(Action.Manage);
}
