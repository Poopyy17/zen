import type { Connection, Model, Schema } from 'mongoose';

/**
 * Mongoose throws if `.model(name, schema)` is called twice with a schema
 * argument on the same (cached, per-tenant) connection — this guards that.
 */
export function getOrCreateModel<T>(connection: Connection, name: string, schema: Schema): Model<T> {
  const existing = connection.models[name];
  if (existing) {
    return existing as Model<T>;
  }
  // Avoid passing T as an explicit type argument to .model() — Mongoose's
  // Model<T> generics are deeply overloaded and unifying them against an
  // external type param here can blow up tsc's memory. Let it infer its own
  // type, then cast at the boundary.
  return connection.model(name, schema) as unknown as Model<T>;
}
