import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '@soa/database';

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
  ) {}

  async signIn(username: string, password: string) {
    const result = await this.databaseService.query<UserLoginRecord>(
      'SELECT TOP (1) [IdUser], [UserName], [Password] FROM [dbo].[User] WHERE [UserName] = @username',
      { username },
    );
    const user = result.recordset[0];

    if (!user || user.Password !== password) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không hợp lệ');
    }

    const payload = { sub: String(user.IdUser), username: user.UserName };
    return {
      access_token: await this.jwtService.signAsync(payload),
      expires_in: '15m',
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
