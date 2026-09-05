import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PlatformAuthModule } from './platform-auth/platform-auth.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
        dbName: config.get<string>('PLATFORM_DB_NAME') ?? 'test-tenant1',
      }),
      inject: [ConfigService],
    }),
    PlatformAuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
