/**
 * Shared async-form rendering states (idle/loading/error/success) — reused
 * across any form in `web` that needs this pattern, not just login.
 */
export const FormStatus = {
  Idle: "idle",
  Loading: "loading",
  Error: "error",
  Success: "success",
} as const;

export type FormStatus = (typeof FormStatus)[keyof typeof FormStatus];
