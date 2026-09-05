import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectConnection } from '@nestjs/mongoose';
import { LoginDto } from 'backend-library';
import * as bcrypt from 'bcrypt';
import type { Connection } from 'mongoose';
import { resolveTenantDbName } from 'tenant-middleware';
import { getOrCreateModel } from './get-or-create-model.js';
import { AdminUser, AdminUserDocument, AdminUserSchema } from './schemas/admin-user.schema.js';
import { User, UserDocument, UserSchema } from './schemas/user.schema.js';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.';

@Injectable()
export class PlatformAuthService {
  private readonly logger = new Logger(PlatformAuthService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto, tenantSlug?: string): Promise<{ accessToken: string }> {
    const dbName = tenantSlug
      ? resolveTenantDbName(tenantSlug)
      : (this.configService.get<string>('PLATFORM_DB_NAME') ?? 'test-tenant1');
    const tenantConnection = this.connection.useDb(dbName, { useCache: true });
    const userModel = getOrCreateModel<UserDocument>(tenantConnection, User.name, UserSchema);
    const adminUserModel = getOrCreateModel<AdminUserDocument>(
      tenantConnection,
      AdminUser.name,
      AdminUserSchema,
    );

    const user = await userModel.findOne({ email: dto.email }).lean();
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    let role: string | undefined;
    if (user.isAdmin) {
      const adminUser = await adminUserModel.findOne({ userId: user.id, status: 'ACTIVE' }).lean();
      if (adminUser) {
        role = adminUser.role;
      } else {
        this.logger.warn(`User ${user.id} has isAdmin=true but no active admin_users record.`);
      }
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role,
    });

    return { accessToken };
  }
}
