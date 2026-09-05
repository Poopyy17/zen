import { ulid } from "ulid";

/**
 * Stable cross-service ID, separate from Mongo's `_id`. Plain ULID, no type
 * prefix — see PROJECT_OUTLINE.md — Cross-Service Data Consistency.
 */
export function generateId(): string {
  return ulid();
}
