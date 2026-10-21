import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC } from './public.decorator.js';
import { ForbiddenException } from '@nestjs/common';
import { ROLES_KEY } from './roles.decorator.js';
import type { Role } from './roles.decorator.js';

export type AuthenticatedRequest = Request & {
  user?: { sub: string | number; role: Role; maSV?: string };
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    // Identity must come from a verified token, including requests through the gateway.
    delete request.headers['x-user-id'];
    delete request.user;
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return true;
    }

    const match = /^Bearer ([^\s]+)$/i.exec(
      request.headers.authorization ?? '',
    );
    if (!match) throw new UnauthorizedException('Thiếu Bearer token hợp lệ');
    try {
      const payload = await this.jwt.verifyAsync<{
        sub?: unknown;
        exp?: unknown;
      }>(match[1], {
        algorithms: ['HS256'],
      });
      if (
        (typeof payload.sub !== 'string' && typeof payload.sub !== 'number') ||
        String(payload.sub).trim() === '' ||
        typeof payload.exp !== 'number' ||
        !Number.isFinite(payload.exp)
      ) {
        throw new Error('Token thiếu định danh hoặc thời hạn');
      }
      const claims = payload as { role?: unknown; maSV?: unknown };
      if (claims.role !== 'admin' && claims.role !== 'student') {
        throw new Error('Token thiếu vai trò; vui lòng đăng nhập lại');
      }
      if (claims.role === 'student' && (typeof claims.maSV !== 'string' || !claims.maSV.trim())) {
        throw new Error('Token thiếu mã sinh viên');
      }
      request.user = { sub: payload.sub, role: claims.role, maSV: typeof claims.maSV === 'string' ? claims.maSV : undefined };
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [context.getHandler(), context.getClass()]) ?? ['admin'];
    if (!roles.includes(request.user!.role)) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
    }
    return true;
  }
}
