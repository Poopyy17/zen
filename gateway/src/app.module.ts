import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PlatformAuthModule } from './platform-auth/platform-auth.module.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PlatformAuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
