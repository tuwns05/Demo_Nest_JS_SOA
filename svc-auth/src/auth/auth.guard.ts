import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
    ForbiddenException,
} from '@nestjs/common'

import { JwtService } from '@nestjs/jwt'
import { Request } from 'express';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './decorators/public.decorator.js';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService, private readonly reflector: Reflector) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(
            IS_PUBLIC_KEY,
            [
                context.getHandler(),
                context.getClass(),
            ],
        );

        if (isPublic) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            throw new UnauthorizedException()
        }
        try {
            const payload = await this.jwtService.verifyAsync(token);
            request['user'] = payload;
        } catch {
            throw new UnauthorizedException()
        }
        const user = request['user'];
        if (user.role !== 'admin' && user.role !== 'student') {
            throw new UnauthorizedException('Vui lòng đăng nhập lại');
        }
        const roles = this.reflector.getAllAndOverride<string[]>('allowed_roles', [context.getHandler(), context.getClass()]) ?? ['admin'];
        if (!roles.includes(user.role)) {
            throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
        }
        return true;
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type == 'Bearer' ? token : undefined;
    }
}
