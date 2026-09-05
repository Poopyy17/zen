# Tech Stack

Quick-reference list of chosen technologies. For the reasoning behind each choice, see `PROJECT_OUTLINE.md`.

## Frontend

| Tech                                       | Role                                                                                                                                                                                                  |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js 16 (Turbopack)                     | Single frontend app (`web`), consumes the API gateway                                                                                                                                                 |
| shadcn/ui on **Base UI** + Tailwind CSS v4 | UI primitives + theme tokens (`ui-library`) — presentational only. shadcn's own recommended default moved from Radix UI to Base UI (MUI-backed) in mid-2026; see PROJECT_OUTLINE.md for the tradeoffs |
| React Hook Form + Zod                      | Form state + validation (`form-library`)                                                                                                                                                              |
| NextAuth.js (Auth.js)                      | Frontend session layer only — backed by `core-service` for actual auth                                                                                                                                |

## Backend

| Tech                                            | Role                                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| NestJS 12 (ESM by default)                      | Service framework — `core-service`, `staff-management`, `case-management`, `gateway` |
| REST over HTTP                                  | Inter-service communication                                                          |
| @nestjs/config                                  | `.env` loading per service                                                           |
| @nestjs/jwt + @nestjs/passport                  | JWT issuance (`core-service`) and verification (gateway/services)                    |
| Custom Permission Matrix (RBAC) + Feature Flags | Authorization/config, defined in `backend-library`                                   |

## Database

| Tech     | Role                                                 |
| -------- | ---------------------------------------------------- |
| MongoDB  | Single cluster, database-per-tenant                  |
| Mongoose | ODM                                                  |
| ULID     | Stable cross-service ID, separate from Mongo's `_id` |

## Monorepo & Tooling

| Tech                                                   | Role                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Turborepo                                              | Monorepo task runner/build orchestration, affected-only tasks                                                                                                                                                                                                                                                  |
| pnpm workspaces (`workspace:*`)                        | Shared libraries linked directly, no independent versioning — decided during scaffolding                                                                                                                                                                                                                       |
| oxlint (backend services + libraries) / ESLint (`web`) | Linting — NestJS's latest CLI now defaults to oxlint (Rust-based, much faster) instead of ESLint; `web` still uses ESLint via `eslint-config-next`, since Next.js's own tooling hasn't moved. Both support the `no-restricted-imports`-equivalent rule needed for the "no Mongoose in `backend-library`" check |
| Prettier                                               | Formatting                                                                                                                                                                                                                                                                                                     |
| Husky + lint-staged                                    | Pre-commit checks (fast, bypassable layer)                                                                                                                                                                                                                                                                     |

## Testing

| Tech                      | Role                                                                                                                                                                                                                    |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest (backend services) | Unit + integration tests — NestJS's latest CLI now defaults to Vitest instead of Jest, partly because Nest v12 is ESM by default and Vitest has less ESM friction. Jest-compatible API, same role as originally planned |
| Supertest                 | HTTP-level integration tests per service (already included by NestJS's scaffold)                                                                                                                                        |
| mongodb-memory-server     | Ephemeral in-memory MongoDB for tests                                                                                                                                                                                   |
| Playwright                | Browser e2e — deferred until there's a working UI to test                                                                                                                                                               |

## CI/CD & Infra

| Tech                                | Role                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| GitHub Actions                      | CI (lint/build/test) + CD (image build/push), required PR checks                |
| Docker                              | One `Dockerfile` per deployable service, shared-instance model (not per-tenant) |
| GitHub Container Registry (ghcr.io) | Image registry — default placeholder, not a hard commitment                     |
| Wildcard DNS + TLS                  | Subdomain-based tenant routing (`*.yourapp.com`)                                |
| Hosting provider                    | **TBD** — deliberately deferred, everything above is host-agnostic              |
