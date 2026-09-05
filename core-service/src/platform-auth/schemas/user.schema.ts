import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { PlatformEntityStatus, PlatformUser } from 'backend-library';
import type { HydratedDocument } from 'mongoose';

/**
 * Credentials only — this is the sole place email/passwordHash live for
 * platform-level accounts. See PROJECT_OUTLINE.md, "Platform Operators
 * (Super Admin)". Explicit `collection: 'user'` since Mongoose's default
 * pluralization ('users') doesn't match the seed script's singular name.
 * Implements the shared `PlatformUser` shape from `backend-library` so the
 * field contract is defined once — Mongoose itself stays out of
 * `backend-library` per "Enforcing Coding Rules Before Merge".
 */
@Schema({ timestamps: true, collection: 'user' })
export class User implements PlatformUser {
  @Prop({ required: true, unique: true })
  id!: string;

  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true, default: false })
  isAdmin!: boolean;

  @Prop({ type: String, required: true })
  status!: PlatformEntityStatus;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
