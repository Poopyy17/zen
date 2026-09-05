import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoginDto, TENANT_SLUG_HEADER } from 'backend-library';
import { firstValueFrom } from 'rxjs';
import { isAxiosError } from 'axios';

/**
 * Thin pass-through to core-service's /platform-auth/login — no JWT to
 * verify and no tenant to resolve for a login request itself, so the
 * gateway's role here is routing only. See PROJECT_OUTLINE.md,
 * "Platform Operators (Super Admin)".
 */
@Injectable()
export class PlatformAuthService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto, tenantSlug?: string): Promise<{ accessToken: string }> {
    const coreServiceUrl = this.configService.getOrThrow<string>('CORE_SERVICE_URL');
    try {
      const response = await firstValueFrom(
        this.httpService.post<{ accessToken: string }>(`${coreServiceUrl}/platform-auth/login`, dto, {
          headers: tenantSlug ? { [TENANT_SLUG_HEADER]: tenantSlug } : {},
        }),
      );
      return response.data;
    } catch (error) {
      if (isAxiosError(error) && error.response) {
        throw new HttpException(error.response.data, error.response.status);
      }
      throw error;
    }
  }
}
