# Zen

## Running the project locally

1. Install dependencies:

   ```bash
   pnpm i
   ```

2. Set your `MONGODB_URI` in each service's `.env` file (`core-service`, `staff-management`, `case-management`, `gateway`) — needed to connect to MongoDB for testing.

3. Start everything locally:

   ```bash
   pnpm dev
   ```

4. Test multi-tenant login: seed a second tenant with `scripts/seed-super-admin.mjs` (defaults seed `tenant1`/`test-tenant1`):

   ```bash
   TENANT_SLUG=tenant2 TENANT_NAME=Tenant2 TENANT_DB_NAME=test-tenant2 PLATFORM_DB_NAME=test-tenant2 \
     SUPER_ADMIN_PASSWORD=<password> node --env-file=core-service/.env scripts/seed-super-admin.mjs
   ```

   Then open `http://tenant1.localhost:3000` and `http://tenant2.localhost:3000` in separate tabs — each logs in with its own seeded credentials (no `/etc/hosts` setup needed, `*.localhost` resolves automatically).