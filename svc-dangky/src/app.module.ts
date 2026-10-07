import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
    DatabaseModule.register(),
    HttpModule.register({ timeout: 5000 }),
  ],
  controllers: [AppController],
  providers: [AppService, SinhVienClient, DeTaiClient],
  exports: [SinhVienClient, DeTaiClient],
})
export class AppModule {}
