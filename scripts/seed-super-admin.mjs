/**
 * Seeds a bootstrap tenant into the platform registry (`tenant_information`),
 * a login account (`user`), and a slim `admin_users` link record — see
 * PROJECT_OUTLINE.md, "Platform Operators (Super Admin)". Credentials
 * (email/passwordHash) live only in `user`; `admin_users` just maps a
 * `userId` to a `role`, so a leaked `user` dump doesn't reveal who's an
 * admin, and revoking admin privilege doesn't touch the login account
 * itself. Idempotent: re-running upserts by slug/email rather than creating
 * duplicates.
 *
 * Usage:
 *   pnpm run seed:super-admin
 *   pnpm run seed:super-admin:tenant2
 *   TENANT_SLUG=acme TENANT_NAME=Acme TENANT_DB_NAME=test-acme PLATFORM_DB_NAME=test-acme \
 *     SUPER_ADMIN_EMAIL=me@careerteam.com SUPER_ADMIN_PASSWORD=... pnpm run seed:super-admin
 *
 * Reads MONGODB_URI from core-service/.env (via the root script's --env-file
 * flag). PLATFORM_DB_NAME/TENANT_SLUG/TENANT_NAME/TENANT_DB_NAME default to
 * the tenant1 bootstrap values but can all be overridden — one script seeds
 * any tenant, rather than duplicating this file per tenant. The target
 * database must already exist; this script doesn't create one.
 * SUPER_ADMIN_PASSWORD is optional — if omitted, a random one is generated
 * and printed once.
 */
import { randomBytes } from "node:crypto";
import { PlatformRole } from "backend-library";
import { MongoClient } from "mongodb";
import bcrypt from "bcrypt";
import { ulid } from "ulid";

const MONGODB_URI = process.env.MONGODB_URI;
const PLATFORM_DB_NAME = process.env.PLATFORM_DB_NAME ?? "test-tenant1";
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? "superadmin@zen.com";
const generatedPassword = process.env.SUPER_ADMIN_PASSWORD ? null : randomBytes(18).toString("base64url");
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD ?? generatedPassword;

const TENANT_SLUG = process.env.TENANT_SLUG ?? "tenant1";
const TENANT_NAME = process.env.TENANT_NAME ?? "Tenant1";
const TENANT_DB_NAME = process.env.TENANT_DB_NAME ?? "test-tenant1";

if (!MONGODB_URI) {
  console.error(
    "Missing MONGODB_URI. Run via `pnpm run seed:super-admin` so it's loaded from core-service/.env.",
  );
  process.exit(1);
}

const client = new MongoClient(MONGODB_URI);

try {
  await client.connect();
  const platformDb = client.db(PLATFORM_DB_NAME);
  const now = new Date();

  await platformDb.collection("tenant_information").updateOne(
    { slug: TENANT_SLUG },
    {
      $setOnInsert: {
        id: ulid(),
        slug: TENANT_SLUG,
        name: TENANT_NAME,
        dbName: TENANT_DB_NAME,
        jwtSecret: randomBytes(48).toString("hex"),
        status: "ACTIVE",
        createdAt: now,
      },
      $set: { updatedAt: now },
    },
    { upsert: true },
  );

  const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
  const user = await platformDb.collection("user").findOneAndUpdate(
    { email: SUPER_ADMIN_EMAIL },
    {
      $setOnInsert: {
        id: ulid(),
        email: SUPER_ADMIN_EMAIL,
        createdAt: now,
      },
      $set: {
        passwordHash,
        isAdmin: true,
        status: "ACTIVE",
        updatedAt: now,
      },
    },
    { upsert: true, returnDocument: "after" },
  );

  await platformDb.collection("admin_users").updateOne(
    { userId: user.id },
    {
      $setOnInsert: {
        id: ulid(),
        userId: user.id,
        createdAt: now,
      },
      $set: {
        role: PlatformRole.SuperAdmin,
        status: "ACTIVE",
        updatedAt: now,
      },
    },
    { upsert: true },
  );

  console.log(`Seeded tenant "${TENANT_SLUG}" (${TENANT_DB_NAME}) in the platform registry.`);
  console.log(`Seeded Super Admin user "${SUPER_ADMIN_EMAIL}" (admin_users role: ${PlatformRole.SuperAdmin}).`);
  if (generatedPassword) {
    console.log(`Generated password (save this now, it will not be shown again): ${generatedPassword}`);
  }
} finally {
  await client.close();
}
