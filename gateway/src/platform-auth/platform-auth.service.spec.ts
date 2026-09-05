import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TENANT_SLUG_HEADER } from 'backend-library';
import { AxiosError, AxiosHeaders } from 'axios';
import { of, throwError } from 'rxjs';
import { PlatformAuthService } from './platform-auth.service.js';

describe('PlatformAuthService', () => {
  let httpService: { post: ReturnType<typeof vi.fn> };
  let service: PlatformAuthService;

  beforeEach(async () => {
    httpService = { post: vi.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PlatformAuthService,
        { provide: HttpService, useValue: httpService },
        { provide: ConfigService, useValue: { getOrThrow: () => 'http://localhost:3001' } },
      ],
    }).compile();

    service = moduleRef.get(PlatformAuthService);
  });

  it('forwards a successful response from core-service', async () => {
    httpService.post.mockReturnValue(of({ data: { accessToken: 'a-token' } }));

    const result = await service.login({ email: 'a@b.com', password: 'x' });

    expect(result).toEqual({ accessToken: 'a-token' });
    expect(httpService.post).toHaveBeenCalledWith(
      'http://localhost:3001/platform-auth/login',
      { email: 'a@b.com', password: 'x' },
      { headers: {} },
    );
  });

  it('forwards the tenant slug header when one is given', async () => {
    httpService.post.mockReturnValue(of({ data: { accessToken: 'a-token' } }));

    await service.login({ email: 'a@b.com', password: 'x' }, 'tenant2');

    expect(httpService.post).toHaveBeenCalledWith(
      'http://localhost:3001/platform-auth/login',
      { email: 'a@b.com', password: 'x' },
      { headers: { [TENANT_SLUG_HEADER]: 'tenant2' } },
    );
  });

  it('forwards the status and body of an error response from core-service', async () => {
    const axiosError = new AxiosError(
      'Request failed',
      'ERR',
      undefined,
      undefined,
      {
        status: 401,
        data: { message: 'Invalid email or password.' },
        statusText: 'Unauthorized',
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
      },
    );
    httpService.post.mockReturnValue(throwError(() => axiosError));

    await expect(service.login({ email: 'a@b.com', password: 'wrong' })).rejects.toMatchObject({
      status: 401,
      response: { message: 'Invalid email or password.' },
    });
  });
});
