import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { PlatformRole } from 'backend-library';
import type { PlatformAdminUser, PlatformEntityStatus } from 'backend-library';
import type { HydratedDocument } from 'mongoose';

/**
 * Privilege only — no credentials here, those live in `user`. `userId`
 * references `User.id`. Only consulted when a `user`'s `isAdmin` flag is
 * set. See PROJECT_OUTLINE.md, "Platform Operators (Super Admin)".
 * Implements the shared `PlatformAdminUser` shape from `backend-library`.
 */
@Schema({ timestamps: true, collection: 'admin_users' })
export class AdminUser implements PlatformAdminUser {
  @Prop({ required: true, unique: true })
  id!: string;

  @Prop({ required: true, unique: true })
  userId!: string;

  @Prop({ type: String, required: true, enum: PlatformRole })
  role!: PlatformRole;

  @Prop({ type: String, required: true })
  status!: PlatformEntityStatus;
}

export type AdminUserDocument = HydratedDocument<AdminUser>;
export const AdminUserSchema = SchemaFactory.createForClass(AdminUser);
