/**
 * Per-request tenant -> DB resolution.
 *
 * NOT YET IMPLEMENTED — real per-request resolver logic (AsyncLocalStorage-based
 * request context, cached tenant lookups against `platform`, MongoClient.db()
 * scoping) is real design work beyond initial package scaffolding.
 * See PROJECT_OUTLINE.md — Multi-Tenant DB Connection Strategy.
 */
export {};
