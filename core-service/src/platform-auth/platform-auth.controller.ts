import { Body, Controller, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { LoginDto, TENANT_SLUG_HEADER } from 'backend-library';
import { PlatformAuthService } from './platform-auth.service.js';

@Controller('platform-auth')
export class PlatformAuthController {
  constructor(private readonly platformAuthService: PlatformAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Headers(TENANT_SLUG_HEADER) tenantSlug?: string) {
    return this.platformAuthService.login(dto, tenantSlug);
  }
}
