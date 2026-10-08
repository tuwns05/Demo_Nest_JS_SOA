import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard.js';
import { DatabaseModule } from '@soa/database';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HttpModule } from '@nestjs/axios';
import { SinhVienClient } from './clients/sinhvien.client.js';
import { DeTaiClient } from './clients/detai.client.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.getOrThrow<string>('JWT_SECRET');
        if (secret.trim().length < 32) {
          throw new Error(
            'JWT_SECRET phải có ít nhất 32 ký tự và dùng chung với svc-auth/gateway.',
          );
        }
        return { secret };
      },
    }),
    DatabaseModule.register(),
    HttpModule.register({ timeout: 5000, maxRedirects: 0 }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    SinhVienClient,
    DeTaiClient,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [SinhVienClient, DeTaiClient],
})
export class AppModule {}
