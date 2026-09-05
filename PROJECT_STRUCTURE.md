# Project Structure

Folder layout of the monorepo. For the reasoning behind these boundaries, see `PROJECT_OUTLINE.md`.

```
📁 zen/
├── 📁 web/                     — Next.js frontend
│   └── 📄 .env
├── 📁 gateway/                 — single entry point for `web`
│   └── 📄 .env
├── 📁 core-service/            — identity/auth, tenant registry, config, roles
│   └── 📄 .env
├── 📁 staff-management/        — staff/employee business data
│   └── 📄 .env
├── 📁 case-management/         — case records + case-related form submissions
│   └── 📄 .env
├── 📁 ui-library/              — presentational shadcn primitives + theme tokens
├── 📁 backend-library/         — shared constants/enums/DTOs/decorators/guards/etc.
│   └── 📁 src/
│       ├── 📁 enums/
│       │   ├── 📄 featureflags.ts        — canonical feature flag catalog
│       │   └── 📄 permission-matrix.ts   — canonical Module x Action catalog
│       └── 📁 utils/
│           └── 📄 generate-id.ts         — shared ULID generator
├── 📁 form-library/            — React Hook Form + Zod, per tenant
│   └── 📁 tenants/
│       ├── 📁 tenant1/
│       └── 📁 tenant2/
├── 📁 tenant-middleware/       — per-request tenant → DB resolution
├── 📄 turbo.json
└── 📄 package.json             — workspaces, each folder above listed explicitly
```

## Top-Level Folders at a Glance

| Folder              | Type       | Port | Purpose                                                                                           |
| ------------------- | ---------- | ---- | ------------------------------------------------------------------------------------------------- |
| `web`               | Deployable | 3000 | Next.js frontend, consumes the gateway                                                            |
| `gateway`           | Deployable | 3004 | Verifies JWTs, resolves tenant from subdomain, feature-flag/permission gating, routes to services |
| `core-service`      | Deployable | 3001 | Sole identity authority — credentials, JWT issuance, tenant registry, config, roles               |
| `staff-management`  | Deployable | 3002 | Staff/employee business data                                                                      |
| `case-management`   | Deployable | 3003 | Case records + case-related form submissions                                                      |
| `ui-library`        | Library    | —    | Presentational shadcn primitives + theme tokens                                                   |
| `backend-library`   | Library    | —    | Shared constants/enums/DTOs/decorators/guards/interceptors/pipes/utils/validators                 |
| `form-library`      | Library    | —    | All form functionality, one folder per tenant                                                     |
| `tenant-middleware` | Library    | —    | Per-request tenant → DB resolution logic                                                          |

Deployable services each own a `.env`; libraries don't — they inherit whichever service's runtime config imports them. All libraries are workspace-linked (`workspace:*`), no independent versioning.
