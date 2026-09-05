import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { PlatformRole } from 'backend-library';
import * as bcrypt from 'bcrypt';
import { AdminUser } from './schemas/admin-user.schema.js';
import { User } from './schemas/user.schema.js';
import { PlatformAuthService } from './platform-auth.service.js';

vi.mock('bcrypt', () => ({ compare: vi.fn() }));

function leanQuery(result: unknown) {
  return { lean: () => Promise.resolve(result) };
}

describe('PlatformAuthService', () => {
  let userModel: { findOne: ReturnType<typeof vi.fn> };
  let adminUserModel: { findOne: ReturnType<typeof vi.fn> };
  let useDb: ReturnType<typeof vi.fn>;
  let service: PlatformAuthService;

  const activeUser = {
    id: 'user-ulid',
    email: 'admin@example.com',
    passwordHash: 'hashed',
    isAdmin: true,
    status: 'ACTIVE',
  };

  beforeEach(async () => {
    userModel = { findOne: vi.fn() };
    adminUserModel = { findOne: vi.fn() };

    const tenantConnection = {
      models: {},
      model: vi.fn((name: string) => {
        if (name === User.name) return userModel;
        if (name === AdminUser.name) return adminUserModel;
        throw new Error(`Unexpected model requested: ${name}`);
      }),
    };
    useDb = vi.fn().mockReturnValue(tenantConnection);

    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret' })],
      providers: [
        PlatformAuthService,
        { provide: getConnectionToken(), useValue: { useDb } },
        { provide: ConfigService, useValue: { get: vi.fn() } },
      ],
    }).compile();

    service = moduleRef.get(PlatformAuthService);
  });

  it('resolves the tenant db by convention when a tenant slug is given', async () => {
    userModel.findOne.mockReturnValue(leanQuery(null));

    await expect(
      service.login({ email: 'nope@example.com', password: 'x' }, 'tenant2'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(useDb).toHaveBeenCalledWith('test-tenant2', { useCache: true });
  });

  it('falls back to the default platform db when no tenant slug is given', async () => {
    userModel.findOne.mockReturnValue(leanQuery(null));

    await expect(service.login({ email: 'nope@example.com', password: 'x' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(useDb).toHaveBeenCalledWith('test-tenant1', { useCache: true });
  });

  it('rejects an unknown email', async () => {
    userModel.findOne.mockReturnValue(leanQuery(null));

    await expect(service.login({ email: 'nope@example.com', password: 'x' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a wrong password', async () => {
    userModel.findOne.mockReturnValue(leanQuery(activeUser));
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(
      service.login({ email: activeUser.email, password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns a token with the resolved role for an admin user', async () => {
    userModel.findOne.mockReturnValue(leanQuery(activeUser));
    adminUserModel.findOne.mockReturnValue(
      leanQuery({ userId: activeUser.id, role: PlatformRole.SuperAdmin, status: 'ACTIVE' }),
    );
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await service.login({ email: activeUser.email, password: 'correct' });

    expect(result.accessToken).toEqual(expect.any(String));
    const [, payload] = result.accessToken.split('.');
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
    expect(decoded).toMatchObject({ sub: activeUser.id, email: activeUser.email, role: PlatformRole.SuperAdmin });
  });

  it('returns a token with no role for a non-admin user', async () => {
    userModel.findOne.mockReturnValue(leanQuery({ ...activeUser, isAdmin: false }));
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await service.login({ email: activeUser.email, password: 'correct' });

    const [, payload] = result.accessToken.split('.');
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
    expect(decoded.role).toBeUndefined();
    expect(adminUserModel.findOne).not.toHaveBeenCalled();
  });
});
