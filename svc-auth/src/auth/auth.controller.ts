import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  ServiceUnavailableException,
  SetMetadata,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { SignInRequest } from './dto/signIn.request.js';
import { SignInResponse } from './dto/signIn.reponse.js';
import { Public } from './decorators/public.decorator.js';
import { CreateStudentAccountDto } from './dto/create-student-account.dto.js';
import { GoogleCredentialDto } from './dto/google-credential.dto.js';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('accounts/student')
  createStudentAccount(@Body() dto: CreateStudentAccountDto) {
    return this.authService.createStudentAccount(dto.maSV);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() signInDto: SignInRequest): Promise<SignInResponse> {
    return this.authService.signIn(signInDto.user, signInDto.password);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('google')
  signInWithGoogle(@Body() dto: GoogleCredentialDto) {
    return this.authService.signInWithGoogle(dto.credential);
  }

  @Public()
  @Get('google/config')
  googleConfig() {
    return this.authService.googleClientId();
  }

  @HttpCode(HttpStatus.OK)
  @SetMetadata('allowed_roles', ['admin', 'student'])
  @Post('google/link')
  linkGoogle(@Req() request: Request & { user?: { sub?: string } }, @Body() dto: GoogleCredentialDto) {
    return this.authService.linkGoogle(String(request.user?.sub ?? ''), dto.credential);
  }

  @Public()
  @Get('health')
  async getHealth(): Promise<{ status: string; service: string; message?: string }> {
    const health = await this.authService.getHealth();
    if (health.status === 'ok') {
      return health;
    }
    throw new ServiceUnavailableException(health);
  }

  @Get('profile')
  @SetMetadata('allowed_roles', ['admin', 'student'])
  getProfile(): string {
    return 'protected route';
  }
}
