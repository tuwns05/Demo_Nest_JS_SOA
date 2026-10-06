import { Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth.guard.js';

export const jwtContants = {
  secret: '1b06cf8b17730a7a8c4e279c3eea613557e3cb5adecda9ee6e96107902dc6000',
};

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: jwtContants.secret,
      signOptions: { expiresIn: '60s' }
    })
  ],
  providers: [AuthService, {
    provide: APP_GUARD,
    useClass: AuthGuard,
  },],
  controllers: [AuthController],
  exports: [AuthService]
})
export class AuthModule { }
