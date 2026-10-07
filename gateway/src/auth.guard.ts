import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export type AuthenticatedRequest = Request & { user?: { sub: string | number } };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    delete request.headers['x-user-id'];
    if ((request.method === 'POST' && request.path === '/auth/login') ||
        (request.method === 'GET' && request.path === '/health')) return true;
    const match = /^Bearer ([^\s]+)$/i.exec(request.headers.authorization ?? '');
    if (!match) throw new UnauthorizedException('Thiếu Bearer token hợp lệ');
    try {
      const payload = await this.jwt.verifyAsync(match[1], { algorithms: ['HS256'] });
      if ((typeof payload.sub !== 'string' && typeof payload.sub !== 'number') ||
          String(payload.sub).trim() === '') throw new Error('Thiếu định danh người dùng');
      request.user = { sub: payload.sub };
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
    return true;
  }
}
