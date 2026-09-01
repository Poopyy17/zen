# Tech Stack Outline

## Overview

This project is a multi-tenant, config-driven application built as a set of microservices, organized in a single monorepo. The frontend is a single Next.js app; the backend is split into independent NestJS services, each running on its own port and fronted by a single API gateway. Turborepo ties the monorepo together so all services can be developed and run with one command.

**Frontend architecture decision:** a single Next.js app (not one frontend per service) was chosen over a per-service micro-frontend split. Since UI (e.g. per-tenant header/branding) is config-driven and must stay visually consistent across the whole app, one frontend fetching tenant config from one place avoids duplicating theming logic across multiple Next.js apps. A per-service frontend split is worth revisiting later only if a specific service needs an independently-deployable UI (e.g. a partner-facing portal).

## Architecture

```
                     ┌────────────────┐
                     │  Next.js Web   │
                     │  (frontend)    │
                     └───────┬────────┘
                             │
                             ▼
                     ┌────────────────┐
                     │  API Gateway   │
                     └───────┬────────┘
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
      ┌───────────────┐┌───────────────┐┌───────────────┐
      │ core-service  ││staff-management││case-management│
      │  :3001        ││    :3002       ││    :3003      │
      └───────┬───────┘└───────┬───────┘└───────┬───────┘
              │                │                │
              └────────────────┼────────────────┘
                                ▼
                  ┌───────────────────────────┐
                  │   MongoDB cluster (1)     │
                  │                           │
                  │  platform  (tenant        │
                  │            directory)     │
                  │  tenant_acme              │
                  │    ├─ core.config         │
                  │    ├─ staff.employees     │
                  │    └─ cases.records       │
                  │  tenant_globex            │
                  │    └─ ... (same shape)    │
                  └───────────────────────────┘
```

`ui-library` and `backend-library` aren't shown here — they're build-time libraries, not deployed services (see Monorepo Layout).

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js | Single web app consuming the API gateway |
| Backend | NestJS | One app per microservice |
| Monorepo tooling | Turborepo | Runs/builds all apps with one command |
| Inter-service communication | REST over HTTP | Simplest to start with; no message broker for now |
| API Gateway | NestJS app (or lightweight reverse proxy) | Single entry point for the frontend; exact implementation TBD |
| Database | MongoDB, single cluster | Multi-tenant; database-per-tenant (see below) |
| Forms | React Hook Form + Zod | Pairs with shadcn's `Form` component (already the basis of `ui-library`); Zod schemas double as validation + type definitions per form |
| Authentication | NextAuth.js (`web` only) + `core-service`-issued JWTs | NextAuth is Next.js-only and cannot run inside a NestJS service; it's the frontend session layer, backed by a Credentials provider that calls `core-service` (see Authentication & Authorization below) |

## Services & Ports

| Service | Port | Responsibility |
|---|---|---|
| `web` | 3000 | Next.js frontend (Next.js's own default — not previously written down) |
| `core-service` | 3001 | Sole identity authority: pure credentials only (`core.users` — email, password hash, tokens), JWT issuance/verification, tenant registry, per-tenant config (`core.config`), role→permission assignments (`core.roles`). Deliberately isolated — nothing business-domain-specific lives here. |
| `staff-management` | 3002 | All staff/employee business data, including the "additional data" side of a user (job title, department, schedule, etc. — `staff.employees`), linked to `core.users` by a shared `userId` (app-enforced, no native FK) rather than storing credentials itself. |
| `case-management` | 3003 | Case records (`cases.records`), including form submissions from `form-library` **for forms that are actually case-related**. Not a catch-all for every tenant form — a form belongs wherever its subject belongs (e.g. a staff onboarding form's data would belong to `staff-management`, not here). |
| API Gateway | 3004 | Single entry point for `web`. Verifies JWTs, resolves tenant from subdomain, applies feature-flag/permission gating, then forwards to whichever service(s) the request needs (plain HTTP calls, e.g. via `@nestjs/axios` — no reverse proxy needed between gateway and services). |

Each service reads/writes its own collection namespace (`core.*`, `staff.*`, `cases.*`) inside whichever tenant database the request belongs to — see Multi-Tenancy Approach below. `staff.employees` and `cases.records` both reference `core.users`/other collections by `userId`/similar ids rather than embedding another service's data, enforced in application code since Mongo has no native cross-collection FK constraints (same open gap noted below).

## Proposed Monorepo Layout

Every service and library sits directly under the repo root, distinguished by whether it has a `main`/`start` script (deployable) or is purely a library consumed at build time. No shared root `.env` — each deployable service owns its own `.env`, since each service has its own config needs (own Mongo connection details, own port, own secrets) and this keeps services independently configurable and deployable, consistent with each service owning its own schemas/collections.

```
zen/
  web/                 # Next.js frontend
    .env
  gateway/             # API Gateway
    .env
  core-service/        # NestJS
    .env
  staff-management/    # NestJS
    .env
  case-management/     # NestJS
    .env
  ui-library/          # Pure presentational shadcn primitives + theme tokens.
                        # No react-hook-form/Zod imports — no form validation or
                        # submission logic. Widgets keep their own intrinsic UI
                        # behavior (e.g. Select open/close via Radix), just not
                        # form behavior.
  backend-library/     # Shared constants, enums, DTOs/interfaces, decorators,
                        # guards, interceptors, pipes, utils, validators
                        # (NOT Mongoose models — each service owns its own schemas)
  form-library/        # Owns ALL form functionality: RHF-bound Form/FormField/
                        # FormControl/FormMessage wrappers, useForm + zodResolver
                        # setup, per-tenant Zod schemas, submit handlers. Imports
                        # plain styled components from ui-library and binds them
                        # to RHF state itself. One folder per tenant.
    tenants/
      tenant1/
      tenant2/
  tenant-middleware/    # Shared tenant-resolution logic (resolves tenant -> DB)
  turbo.json
  package.json          # defines workspaces (each folder above listed explicitly)
```

Libraries (`ui-library`, `backend-library`, `tenant-middleware`, `form-library`) have no `.env` of their own — they're consumed at build time by whichever service imports them, so they inherit that service's runtime config rather than carrying their own.

**Versioning: workspace-linked, no independent version numbers.** Every service depends on these libraries via the package manager's workspace protocol (`"backend-library": "workspace:*"`), not a published/pinned version — there's no private registry, no publish step, no version bumps. Every service always uses whatever's currently in the repo. A breaking change to a shared library is caught automatically by the existing CI gate (`turbo build`/`turbo test` as a required check) rather than by version discipline — a PR that breaks a consuming service simply fails to merge.

### `form-library`: env-driven per-tenant forms

- **Styling vs. functionality boundary**: `ui-library` has zero `react-hook-form`/`zod` imports — its components are plain, presentational, and take explicit props (`value`, `onChange`, `error`, `disabled`). Any file that imports RHF or Zod belongs in `form-library`, including shadcn's `Form`, `FormField`, `FormItem`, `FormControl`, and `FormMessage` wrappers — their entire purpose is gluing RHF to the UI, so they move to `form-library` rather than staying in `ui-library` as shadcn scaffolds them by default.
- `form-library` depends on `ui-library` (one-way) for the plain styled pieces (`Input`, `Select`, `Button`, etc.), then wires them to RHF state itself via `Controller`/`register`. `ui-library` never depends on `form-library`.
- Exception: intrinsic widget behavior that isn't form logic (e.g. a `Select`'s open/close state and keyboard navigation, inherited from Radix) correctly stays in `ui-library` — the boundary is "no form validation/submission logic," not "no behavior at all."
- Because shadcn components read from shared theme tokens (also owned by `ui-library`) rather than hardcoded styles, a tenant's forms automatically pick up that tenant's branding (the same tokens driving the configurable header) without any per-tenant styling in `form-library` itself.
- Each tenant's forms live in their own folder under `form-library/tenants/<tenant-slug>/`, so one tenant's forms never clash with another's.
- The `TENANT_FORM` env var lives in the `.env` of whichever service imports `form-library` (not in `form-library` itself), e.g. `TENANT_FORM=tenant1`. That service uses it to select which tenant folder gets loaded/served.
- **This is a deliberate divergence from the rest of the architecture, not an inconsistency to silently paper over**: everywhere else (the MongoDB layer, tenant-middleware), a single running deployment serves *all* tenants, resolved per-request. `form-library`'s env-driven selection instead implies **one deployment per tenant** for whatever service consumes it — the env var is fixed at process start, so a single running instance of that service can only ever serve one tenant's forms.
- This is an accepted tradeoff for now, with the deployment implications (how many instances, which service consumes `form-library`, how that scales past a handful of tenants) intentionally deferred until deployment strategy is discussed as the project grows.

## Multi-Tenancy Approach

Single MongoDB cluster, **database-per-tenant**:

- Each tenant gets its own database (e.g. `tenant_acme`, `tenant_globex`) — full data isolation between tenants, no `tenantId` field needed on every document, no risk of a missed filter leaking one tenant's data into another's query.
- Inside a tenant's database, collections are namespaced by the service that owns them (`core.config`, `staff.employees`, `cases.records`). Services share the physical database per tenant but keep logical ownership by collection — they still only read/write their own collections.
- A separate shared **`platform` database** holds the tenant directory (tenant ID, slug/subdomain, DB name, status/plan). This is required infrastructure, not optional: something has to resolve "which tenant is this request for" *before* you know which tenant database to connect to, and that lookup can't live inside a per-tenant DB.
- Per-tenant UI config (header/branding) lives inside that tenant's own database (`core.config`), colocated with the rest of that tenant's data.
- **Accepted tradeoff for now**: this couples all three services to one physical database per tenant, rather than full per-service database ownership (which would mean a database per service *per tenant*). Full per-service isolation is deferred until the app's scale justifies the added complexity — per your call, this migration is left for later.
- **Known follow-on cost** (deferred, not solved now): schema/index changes and cross-tenant admin/reporting queries have to run per-tenant-database rather than once against a shared collection, since there's no single collection spanning all tenants.

## Platform Feature Configuration

The general pattern for tenant flexibility across the whole app: **a hardcoded default in code, optionally overridden per tenant in the database.** This isn't a new mechanism to build — it's the same approach already used for the configurable header and per-tenant hotfix flags, generalized as the standard way to add tenant-specific flexibility to *any* feature going forward, rather than inventing a bespoke config path each time a new "make this tenant-specific" need comes up.

- Every configurable feature (header/branding, a hotfix's changed behavior, a business rule, a workflow toggle) has a default implementation or value defined in the service that owns it (or `backend-library` if it's genuinely cross-cutting).
- A tenant can override that specific feature by storing a value for it in config. Resolution at the point of use is always `tenantOverride ?? codeDefault`.
- **Where the override lives depends on when it's needed, not on convenience**:
  - `platform` (the shared registry, resolved *before* connecting to a tenant's database) — only for what's needed pre-connection: the JWT secret, DB name, and hotfix feature flags/service version used for gateway-level routing decisions.
  - The tenant's own database (`core.config`, inside `tenant_<id>`) — for everything else: header/branding and any other tenant-specific business behavior. Since most feature logic runs *after* a request is already routed and connected to a tenant's database, this is where the majority of overrides belong.
- Overrides are cached the same way as the JWT secret/DB name lookups — resolved once per request lifecycle (or with a short TTL), not queried fresh on every access within a request.

## Authentication & Authorization

**Ownership**: `core-service` is the sole identity authority — it owns user records (per tenant, in `tenant_<id>.core.users`, alongside `core.config`), validates credentials, and issues/signs JWTs. No other service or NextAuth itself can issue a token.

**Per-tenant secrets**: each tenant has its own JWT signing secret, stored as a field on that tenant's record in the `platform` database — not inside the tenant's own database. This is deliberate: verifying a token has to happen *before* connecting to that tenant's specific database, so the secret needs to be available from the same lookup the gateway already does to resolve the tenant. `core-service` uses this same secret to sign tokens for that tenant, and the gateway/services cache each tenant's secret in memory (with a TTL, invalidated on rotation) rather than querying `platform` on every request.

**Refresh tokens**: `core-service` also issues and stores refresh tokens per tenant (alongside `core.users`), signed/validated with that tenant's secret. NextAuth's `jwt` callback calls `core-service`'s refresh endpoint when the access token nears expiry, so `web` gets silent refresh without the user re-authenticating.
- **Reusable, revoked on logout** (not one-time-use/rotating). Simpler to implement, and this is a deliberate simplicity tradeoff, not a solved security question: a stolen refresh token stays valid for an attacker until it expires or the legitimate user happens to log out — there's no way to detect the theft itself, since a stolen token being reused looks identical to normal reuse. Rotating refresh tokens would catch that (reuse of an already-rotated token is a theft signal), but is deferred until this needs to handle more sensitive data or a general launch.
- Being revocable means `core-service` can't treat refresh tokens as purely stateless like JWT access-token verification — it must persist which refresh tokens are still active (e.g. `core.sessions`, alongside `core.users`) so logout can actually invalidate one.
- **Expiry length is hardcoded in `core-service`**, not `web` — `core-service` is what stamps the `exp` claim when it signs a token, so it's the actual source of truth. `web` doesn't keep its own copy of the expiry constant; if it needs to know when a token expires (e.g. a "session expiring soon" warning), it reads the `exp` claim off the token itself.

**Why not NextAuth in `core-service`**: NextAuth (Auth.js) is a Next.js-specific library — its server side is built as Next.js API route handlers, and it has no NestJS equivalent. It can only run inside `web`.

**Frontend flow (`web`)**:
- NextAuth is configured with a **Credentials provider** that, on sign-in, calls `core-service` (through the gateway) with the tenant + login details rather than validating credentials itself.
- `core-service` validates the credentials against that tenant's `core.users` collection and returns a signed JWT (payload includes `userId`, `tenantId`, `role`).
- NextAuth's `jwt`/`session` callbacks store that JWT inside the NextAuth session, so `web` never manages tokens manually — it still gets `useSession()`, cookie handling, and protected-route middleware "for free" from NextAuth, just backed by `core-service` as the actual authority.

**Token forwarding**:
- `web` attaches `Authorization: Bearer <token>` (the `core-service`-issued JWT) to every request it sends to the gateway.
- The gateway forwards that token unchanged to whichever service(s) the request actually needs — matches the "pass the token on depending on what the web needs" model.

**Backend verification (fail-fast at the gateway)**:
- The gateway resolves the tenant from the incoming request, looks up that tenant's secret (cached, from `platform`), and verifies the JWT's signature + expiry itself — **before** forwarding anything. An invalid or expired token is rejected at the gateway; downstream services never see that request.
- Once verified, the gateway forwards the already-validated identity to downstream services as trusted headers (e.g. `X-User-Id`, `X-Tenant-Id`, `X-Role`) rather than making each service re-verify the JWT signature independently.
- The `JwtAuthGuard`/`JwtStrategy` used by the gateway still lives in `backend-library` (shared, not duplicated), but only the gateway runs it for external traffic — `core-service` is the only thing that issues tokens.
- The `tenantId` claim (or forwarded `X-Tenant-Id` header) tells a service which tenant database to operate against via `tenant-middleware`.

**Gateway↔service trust**: `staff-management`/`case-management` are not publicly routable — only the gateway has a public-facing port, so the network topology itself prevents outside traffic from reaching them directly. As cheap defense-in-depth on top of that, each service also checks a shared internal secret header (e.g. `X-Internal-Secret`, matching an env var shared between the gateway and services) before trusting the gateway's forwarded `X-User-Id`/`X-Tenant-Id`/`X-Role` headers. Full mTLS is the more "correct" long-term answer but is deferred — the cert issuance/rotation overhead isn't justified yet.

**Per-tenant secret rotation**: rotation is treated as rare (a compromise response, not a routine operation). The gateway's cached copy of a tenant's secret has a short TTL (e.g. 5 minutes) rather than a real-time invalidation broadcast across gateway instances — after rotation, tokens signed with the old secret simply fail verification once the cache expires, which is the desired effect (old tokens should die on a compromise-driven rotation). Affected users just log in again; no further reconciliation is needed.

**Tenant resolution at the gateway**: subdomain-based (e.g. `acme.yourapp.com`), not header- or path-based. It gives clean per-tenant URLs, resolves the tenant *before* any token exists (needed to route an unauthenticated login request to the right tenant's `core.users`), and avoids the cookie/session-scoping mess path-based routing creates. Header-based doesn't fit a browser-first app, since a user can't set custom headers just by navigating to a URL. For local dev, `*.localhost` (e.g. `tenant1.localhost:3000`) resolves automatically in modern browsers — no `/etc/hosts` or wildcard DNS setup needed.

## Subdomain Routing with a Single Deployment

A single deployed instance can serve every tenant's subdomain — this is the standard mechanism most multi-tenant SaaS products use, and it does **not** require one instance per tenant. Three pieces make it work:

1. **Wildcard DNS**: one record, `*.yourapp.com`, points to the single deployed instance (or its load balancer). Onboarding a new tenant needs zero new DNS records — `acme.yourapp.com`, `globex.yourapp.com`, and any future tenant's subdomain all resolve to the same place automatically.
2. **Wildcard TLS certificate**: one certificate covering `*.yourapp.com` (via Let's Encrypt's DNS-01 challenge, or handled automatically by a host/CDN like Cloudflare or Vercel) serves HTTPS for every current and future tenant subdomain — no per-tenant certificate needed.
3. **Host-header parsing in the app**: the single running instance reads the `Host` header off each incoming request (e.g. `Host: acme.yourapp.com`), strips the base domain to get the subdomain (`acme`), and looks that slug up in `platform` to resolve the actual tenant. In `web`, this is Next.js middleware (`middleware.ts`) reading `request.headers.get('host')`; in the gateway, it's the equivalent NestJS middleware — both run before anything tenant-specific happens.

For local dev, `*.localhost` (e.g. `acme.localhost:3000`) resolves to loopback automatically in modern browsers/OS resolvers — no `/etc/hosts` edits or local wildcard cert needed, since it's plain HTTP.

If `web` ends up hosted on Vercel, it has native support for wildcard/multi-tenant domains that handles the DNS+TLS pieces automatically — a convenience of that one host, not a requirement; the same setup works on any host via the three pieces above. Deployment target itself is still an open gap — this doesn't lock it in.

**Do we need nginx?** Not for local dev, and not as a replacement for the gateway's own routing logic either way — JWT verification, tenant resolution, and feature-flag/permission gating are application logic that has to live in the NestJS gateway itself, not in a reverse-proxy config. Locally, the gateway just makes plain HTTP calls to `core-service`/`staff-management`/`case-management` on their own ports (3001/3002/3003). In production, nginx (or Caddy/Traefik/a managed load balancer) would only be responsible for the wildcard TLS termination described above and forwarding `*.yourapp.com` traffic to wherever `web`/the gateway are deployed — it sits in front of the whole app, not between the gateway and backend services. Not locked in, since it depends on the still-open deployment target (some hosts, like Vercel for `web`, handle wildcard TLS/routing natively).

## Multi-Tenant DB Connection Strategy

Per-request resolver in `tenant-middleware`, **not** an env var like `TENANT_DB=tenant1`:

- Each service keeps one `MongoClient` connected to the shared cluster, created once at startup — it does not connect to any specific tenant database up front.
- Per request, `tenant-middleware` reads the tenant already resolved upstream (the JWT's `tenantId` claim, or the gateway's forwarded `X-Tenant-Id` header) and calls `client.db(tenantDbName)` to get a handle scoped to that tenant. This doesn't open a new connection — MongoDB's driver returns a logical handle backed by the same pooled connections.
- That handle is attached to the request's own execution context (a NestJS request-scoped provider, or `AsyncLocalStorage`) — never a shared singleton/module-level variable. Node handles many requests concurrently on one process, so a plain "current tenant" global would leak one tenant's database handle into a different tenant's concurrent request.
- The `tenantId -> dbName` mapping is cached the same way as the per-tenant JWT secret (or encoded directly as a JWT claim at login), to avoid a `platform` lookup on every request.

**Why not env-based, unlike `form-library`**: an env var is fixed when a process starts, so a single running instance could only ever read/write one tenant's database — the exact "one deployment per tenant" tradeoff already accepted for `form-library`, but applied to every service's core data access instead of one static-file library. That would conflict with the subdomain-based, per-request tenant resolution already decided at the gateway, which assumes one deployment serves every tenant. `form-library` gets away with env-based selection because form definitions are static files chosen once per deploy; a database read/write needs the correct tenant chosen dynamically on practically every request, which a fixed env var can't do.

## Handling Per-Tenant Hotfixes on a Shared Deployment

Since every service is one shared deployment serving all tenants, a single running process executes **one version of the code** at a time — "tenant1 on 1.0, tenant2 on 1.1" can't be expressed per-request the way the DB handle is, because code version is a property of the deployed process, not request-scoped state.

**Default: per-tenant feature flags.** This is a direct application of the Platform Feature Configuration pattern above: the hotfix ships as one deployed version of the code on the shared instance, with the changed behavior guarded behind a flag: `if (tenantFlags.hotfixX) { /* new behavior */ } else { /* old behavior */ }`. Flags live per tenant in `platform` rather than a tenant's own DB, since routing-relevant flags need to be readable before connecting to any tenant database — alongside the JWT secret and DB name already stored and cached there per-request.
- Tenant2 gets the flag turned on immediately for the hotfix; tenant1 stays on the old path until ready.
- Moving tenant1 onto the fix later is just flipping their flag — no redeploy needed.
- Once every tenant is on the new behavior, delete the flag and the old code path entirely — it shouldn't become a permanent fork.
- This keeps the single-shared-instance model intact; it's a config change, not new infrastructure.

**Flag catalog and rollout**: flag keys are defined once, in `backend-library/enums/featureflags.ts` — a single enum shared by every service, so there's one canonical list of valid flag identifiers rather than each service inventing its own. Per-tenant values live on that tenant's `platform` record (`platform.tenants.<id>.featureFlags.<flagKey>`), not a separate collection. When a new flag ships, it's **backfilled to every tenant via a migration** (not written lazily only for the tenant(s) that need it) — every tenant ends up with an explicit value for every known flag, added manually or via a migration script for now. Planned follow-up (not built yet): an in-app setup screen that lets a flag be registered directly into a specific tenant's database without a migration.

**Also usable for API-level gating, not just internal behavior branching**: a `FeatureFlagGuard` + `@RequiresFeatureFlag(FeatureFlag.HotfixX)` decorator pair in `backend-library` (same shape as `JwtAuthGuard`) lets any service, or the gateway, block an entire route unless the resolved tenant's flag is on.

**Escalation only: tenant-aware routing across multiple deployed versions.** For a change too structural for a flag (a full module rewrite, not a toggle), two versions of a service would need to run concurrently, with the gateway routing each tenant to the correct one via a `serviceVersion` field on the tenant's `platform` record — the same lookup pattern as DB name/secret, just routing to a different upstream instead of a different database. This is real infrastructure (running N versions concurrently, gateway maintaining a tenant→version mapping) and is deferred until a change genuinely can't be expressed as a flag — not something to build preemptively.

## Permission Matrix (RBAC)

Authorization is **permission-driven, not role-driven**, in code — roles exist only as an admin-facing convenience for assigning permissions in bulk. Application code never checks a role name (`if (user.role === 'manager')`); it only ever checks a permission (`@RequirePermission(Module.DailyReport, Action.Edit)`). This decouples business logic from however an org happens to name or restructure its roles.

- **Catalog**: `backend-library/enums/permission-matrix.ts` defines the known vocabulary of Modules (e.g. `DailyReport`, `Staff`, `Case`) and Actions (`Manage`, `View`, `Edit`, `Delete`) — shared by every service, following the same "static catalog in code, dynamic grants in DB" pattern as feature flags.
- **`Manage` is a superset** of `View`/`Edit`/`Delete` for that module: `hasPermission(module, action) = grants.includes(action) || grants.includes(Manage)`.
- **Role → permission assignment** is tenant-specific business data, so it lives in the tenant's own database (`core.roles`, alongside `core.users`) — not `platform`. A role is just a named set of (Module, Action) grants; users are assigned a role.
- **Enforcement happens at the owning service, not the gateway** — deliberately different from JWT auth, which fails fast at the gateway. Authentication (is this a valid token) belongs at the edge; authorization (is this user allowed to edit *this* Daily Report) belongs close to the resource, since only the service that owns a module knows its real semantics. A `PermissionGuard` + `@RequirePermission(Module.DailyReport, Action.Edit)` decorator pair in `backend-library` is applied wherever a service needs to protect a route.
- **How a downstream service knows the current user's permissions**: the resolved flat permission set is embedded in the JWT at login/refresh (alongside `userId`/`tenantId`/`role`), so `staff-management`/`case-management` check permissions locally with no live call back to `core-service`. Same staleness tradeoff already accepted for JWT secret rotation — a permission change takes effect on the user's next login/refresh, not instantly mid-session.

## Local Dev Environment for MongoDB

No Docker required — a hosted dev cluster (e.g. MongoDB Atlas free tier) or a natively-installed local MongoDB both work fine; either way, the connection string is just the usual `MONGODB_URI` in each service's `.env` (this is the "connection string in env" that's always been fine — separate from tenant selection, which stays per-request as described above).

Seeding multiple tenant databases for local testing is needed regardless of local-vs-hosted Mongo, since the per-request resolver has nothing to switch between otherwise: a small seed script (plain Node + the MongoDB driver, run via `npm run seed`) creates the `platform` registry entries (a couple of sample tenants, each with its slug/subdomain, DB name, JWT secret) plus their corresponding tenant databases with sample data. This lets `acme.localhost:3000` and `globex.localhost:3000` resolve to two genuinely different tenant databases locally, exercising the real per-request resolver rather than a single hardcoded DB.

## Cross-Service Data Consistency (No Foreign Keys)

Mongo has no native cross-collection FK constraints, so referencing another service's data (e.g. a case's `staffId` pointing at a `staff-management` record) needs two deliberate pieces, both enforced in application code:

**A stable ID separate from Mongo's `_id`.** Every document also gets a plain ULID (no type prefix), generated at creation time via a shared helper in `backend-library/utils` (e.g. `generateId()`), stored as a separate field alongside `_id`. `_id` stays as Mongo's own internal primary key; the ULID is the one used for all cross-service references, JWT claims, and anything exposed in an API response — keeping those contracts independent of Mongo's own ID format.

**Soft delete for anything referenced cross-service.** Referenced entities (staff, users, etc.) are never hard-deleted in normal operation — a `status` field is set to `DELETED` instead, so a case's `staffId` reference never actually dangles; it just resolves to a record flagged deleted. Deleted records are excluded from API responses by default.
- Since a `DELETED` document still physically exists, every query path has to actively exclude it — the common failure mode in soft-delete systems is one query somewhere forgetting that filter and leaking a deleted record back into a response. A shared default-filter helper in `backend-library` (e.g. a Mongoose query plugin, or an `excludeDeleted()` helper every query goes through) handles this once rather than relying on each query remembering it by hand.
- Local dev exception: hard delete is fine for manual cleanup during development, since the data doesn't matter there — the soft-delete discipline is a production/normal-app-flow rule, not a database-level constraint.

## Enforcing Coding Rules Before Merge

Two layers: a fast local one that can be bypassed, and an authoritative one that can't.

- **Local (fast feedback, bypassable)**: Husky + lint-staged runs ESLint + Prettier on staged files at pre-commit, so mistakes get caught before a commit even happens. An optional pre-push hook runs `turbo lint`/`turbo typecheck` across whatever packages actually changed — Turborepo's caching means this only re-checks affected packages, not the whole monorepo. These can be skipped with `git commit --no-verify`, so they're convenience, not the real gate.
- **Authoritative (CI, not bypassable)**: a GitHub Actions workflow on every PR runs `turbo lint`, `turbo build`, `turbo test`, set as a **required status check** in branch protection on `main`. A required check can't be bypassed by an individual dev — GitHub won't allow the merge until it passes.

Two rules enforced through this, differently, based on what kind of rule each one is:
- **"No Mongoose models in `backend-library`"** — a lint rule: `no-restricted-imports` (or `import/no-restricted-paths`) in `backend-library`'s ESLint config bans importing `mongoose` from that package entirely. This is an import-shape rule, so lint catches it reliably.
- **"Every query goes through the default `excludeDeleted` filter"** — not a lint rule, since it's a semantic/business rule lint can't reliably catch. Enforced architecturally instead: a service's data layer never exports the raw Mongoose model or its raw `find`/`findOne` methods — only repository methods that already apply the filter internally. No code path can bypass it, rather than hoping a lint rule catches every place someone forgets.

## Deployment Target: Compute Model

**Confirmed: shared instance per service, not container-per-tenant.** One running container per deployable service — `web`, `gateway`, `core-service`, `staff-management`, `case-management` (5 containers total) — each serving *every* tenant, distinguishing between them via the subdomain on each incoming request (see Subdomain Routing above), not one container per tenant. This was chosen specifically over container-per-tenant on cost grounds: container-per-tenant scales linearly with tenant count (every tenant needs its own always-on container per service, regardless of how much they actually use the app), while shared-instance cost scales with actual traffic/load — adding a new tenant costs close to $0 in new compute, just a new tenant database and `platform` registry entry. Replicas of a given service are added only if aggregate load requires it, independent of tenant count.

Container-per-tenant stays scoped to the two narrow exceptions already documented: `form-library` (forms are static per tenant, chosen once at deploy) and the rare hotfix escalation that's too structural for a feature flag.

## Testing Strategy

Three tiers, matched to how much this architecture depends on getting them right — not an exhaustive pyramid built upfront.

1. **Unit tests (Jest, NestJS's default)** — everything in `backend-library` especially: permission-check logic (`hasPermission`), feature-flag resolution (`tenantOverride ?? codeDefault`), ID generation. This code is used by every service, so bugs here have the widest blast radius — highest value per test written.
2. **Integration tests per service (Jest + `mongodb-memory-server` + Supertest)** — a service running against a real, ephemeral in-memory MongoDB, hitting its actual endpoints. This is where the multi-tenancy-critical behavior gets proven, not just assumed: the `excludeDeleted` filter is really applied, `JwtAuthGuard`/`PermissionGuard`/`FeatureFlagGuard` really block what they should. Priority test to write first: a **concurrency test on `tenant-middleware`'s resolver** — fire several simulated concurrent requests for *different* tenants at once and assert each resolves to its own correct tenant database. This is the one gotcha flagged early on (a global "current tenant" variable would leak across concurrent requests), so it earns a dedicated test rather than relying on code review alone to catch a regression.
3. **A small number of full end-to-end "golden path" tests** — login → dashboard, submit a form → case created, a feature-flag-gated action behaving differently per tenant. Browser-level tooling (Playwright) is deferred until there's an actual working UI worth clicking through; API-level Supertest calls against a Docker-Composed stack cover the same logic more cheaply in the meantime. Run less frequently than unit/integration (e.g. on merge to `main`) rather than blocking every PR, since they're slower and more brittle.

Explicitly skipped for now: contract testing (e.g. Pact) between services — useful once cross-service breakage becomes a recurring real problem, premature with only 3-4 services.

All of this plugs into the CI gate already documented — each service's `test` script just runs under the existing `turbo test` required check.

## CI/CD Pipeline

**Branch strategy**: simple trunk-based — feature/hotfix branches → PR → `main`. `main` is always deployable, protected by the required checks below. No gitflow-style `develop`/`release` branches needed at this scale.

**CI, on every PR (GitHub Actions)**:
1. Checkout, install deps (cached).
2. `turbo lint`, `turbo build`, `turbo test` (unit + integration tiers) — but **affected-only**: Turborepo can compute which packages actually changed and what depends on them (`--filter=...[origin/main]`), so a PR touching only `case-management` doesn't rebuild/retest `staff-management` or the unrelated libraries. This matters as the monorepo grows past 5 services + 4 libraries.
3. This whole workflow is the **required status check** already established in Enforcing Coding Rules Before Merge — a PR can't merge until it's green.
4. The full e2e "golden path" suite does **not** run here — it's slower/more brittle, so it runs separately, post-merge (below), not blocking every PR.

**Post-merge to `main`**:
1. Run the e2e golden-path suite (login → dashboard, form submission → case created, etc.).
2. Build Docker images for whichever services actually changed (same affected-only logic as CI), tagged by **git SHA** rather than semver — consistent with the "no independent versioning" decision for the workspace libraries, and it keeps every image traceable to an exact commit.
3. Push images to a container registry — GitHub Container Registry (ghcr.io) is a reasonable default for now since it needs no separate account and integrates directly with GitHub Actions; this isn't a hard commitment, just avoids blocking on the still-deferred hosting decision.
4. Actual deploy step: **TBD**, blocked on the deferred hosting-provider decision — the pipeline is structured so only this last step needs to change once a host is picked.

**Migrations run as their own explicit step, not on service boot.** Given the database-per-tenant model, auto-running migrations on every service instance's startup would mean every replica racing to migrate every tenant database — instead, a migration (e.g. the "backfill a new feature flag to every tenant" migration from Platform Feature Configuration) runs as a dedicated, deliberately-triggered script/CI job, run once, separate from normal deploys.

**Deferred, not needed now**: Turborepo remote caching (e.g. via Vercel's free tier, or self-hosted) would speed up CI further by caching build/test results across runs, not just within one — worth adding once CI run time actually becomes a pain point, not before.
