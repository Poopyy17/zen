# Tech Debt

Running list of deferred work and known simplifications from initial scaffolding — not final designs. Ordered by priority.

## 1. Setup Screen (In-App Configuration UI)

An in-app setup/admin screen for configuring site features that live in the database (per **Platform Feature Configuration** in `PROJECT_OUTLINE.md`), so toggling or introducing a configurable feature doesn't require a migration.

- Directly addresses the feature-flag rollout gap already documented: today, adding a new flag or changing a tenant's config requires a manual DB write or a migration script (see `PROJECT_OUTLINE.md` — "Handling Per-Tenant Hotfixes on a Shared Deployment" → Flag catalog and rollout).
- Scope: a screen (likely surfaced through `web`, backed by `core-service`) that lists the configurable features for the current tenant and lets an authorized user (per the Permission Matrix) toggle/edit them directly — writing straight to wherever that specific feature's config lives (`platform.tenants.<id>.featureFlags` or a tenant's own `core.config`, depending on the placement rule already documented), rather than through a migration.
- Not built yet — needs its own design pass once there are enough real configurable features to justify a dedicated screen. Currently there's only the placeholder `HotfixX` flag in `backend-library/src/enums/featureflags.ts`.

## 2. shadcn Component Workflow Across the Monorepo

shadcn's CLI can only run against a supported app template (`next`, `vite`, etc.) — it has no way to target a plain workspace library like `ui-library` directly. Today's workaround: run `pnpm dlx shadcn@latest add <component>` from `web`, then manually move the generated file(s) into `ui-library/src/components/ui/` and re-export from its `src/index.ts`.

- Manual, repeatable-but-annoying step for every new component added.
- Possible fix later: a small script (e.g. `pnpm run add-ui-component <name>`) that runs the shadcn CLI in `web` and automates the move + re-export instead of doing it by hand each time.

## 3. Global Date-Time util in backend-library

This is to avoid any timezone issues.