import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { PlatformAuthController } from './platform-auth.controller.js';
import { PlatformAuthService } from './platform-auth.service.js';

@Module({
  imports: [HttpModule.register({})],
  controllers: [PlatformAuthController],
  providers: [PlatformAuthService],
})
export class PlatformAuthModule {}
