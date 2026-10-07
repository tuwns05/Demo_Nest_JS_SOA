import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { SignInRequest } from './dto/signIn.request.js';
import { SignInResponse } from './dto/signIn.reponse.js';
import { Public } from './decorators/public.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() signInDto: SignInRequest): Promise<SignInResponse> {
    return this.authService.signIn(signInDto.username, signInDto.password);
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
  getProfile(): string {
    return 'protected route';
  }
}
