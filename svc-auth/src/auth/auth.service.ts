import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '@soa/database';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

interface UserLoginRecord extends Record<string, unknown> {
  IdUser: number;
  UserName: string;
  Password: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async signIn(username: string, password: string) {
    const result = await this.databaseService.query<UserLoginRecord>(
      'SELECT TOP (1) [IdUser], [UserName], [Password] FROM [dbo].[User] WHERE [UserName] = @username',
      { username: username.trim() },
    );
    const user = result.recordset[0];

    if (!user || !(await bcrypt.compare(password, user.Password))) {
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không hợp lệ');
    }

    const payload = { sub: String(user.IdUser), username: user.UserName };
    return {
      access_token: await this.jwtService.signAsync(payload),
      expires_in: this.config.getOrThrow<string>('JWT_EXPIRES_IN'),
      token_type: 'Bearer',
    };
  }

  async getHealth(): Promise<{ status: string; service: string; message?: string }> {
    try {
      await this.databaseService.query('SELECT 1 AS result');
      return {
        status: 'ok',
        service: 'auth',
      };
    } catch (error) {
      return {
        status: 'down',
        service: 'auth',
        message: error instanceof Error ? error.message : 'database unavailable',
      };
    }
  }
}
