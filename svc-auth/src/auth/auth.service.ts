import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '@soa/database';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { verifyGoogleToken } from './google-token.js';

interface UserLoginRecord extends Record<string, unknown> {
  IdUser: number;
  UserName: string;
  Password: string;
  Role: string | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  googleClientId() {
    return { clientId: this.config.get<string>('GOOGLE_CLIENT_ID') ?? '' };
  }

  async createStudentAccount(maSV: string) {
    const findExisting = async () => {
      const result = await this.databaseService.query(
        'SELECT [IdUser], [UserName], [Role] FROM dbo.[User] WHERE [UserName] = @username',
        { username: maSV },
      );
      return result.recordset[0];
    };
    const accountResponse = (user: Record<string, unknown>) => {
      if (user.Role !== 'student') {
        throw new ConflictException(`Tên tài khoản ${maSV} đã được sử dụng`);
      }
      return { username: user.UserName, role: user.Role };
    };
    const existing = await findExisting();
    // Retry must never reset an existing student's password.
    if (existing) return accountResponse(existing);

    const password = await bcrypt.hash(maSV, 12);
    try {
      const result = await this.databaseService.query(
        `INSERT INTO dbo.[User] ([UserName], [Password], [Role])
         OUTPUT INSERTED.IdUser, INSERTED.UserName, INSERTED.Role
         VALUES (@username, @password, 'student')`,
        { username: maSV, password },
      );
      return accountResponse(result.recordset[0]);
    } catch (error) {
      const sql = error as { number?: number; originalError?: { info?: { number?: number } } };
      if ([2601, 2627].includes(sql?.number ?? sql?.originalError?.info?.number ?? 0)) {
        const concurrent = await findExisting();
        if (concurrent) return accountResponse(concurrent);
      }
      throw error;
    }
  }

  async signIn(username: string, password: string) {
    const result = await this.databaseService.query<UserLoginRecord>(
      'SELECT TOP (1) [IdUser], [UserName], [Password], [Role] FROM [dbo].[User] WHERE [UserName] = @username',
      { username: username.trim() },
    );
    const user = result.recordset[0];

    if (!user || !(await bcrypt.compare(password, user.Password))) {
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không hợp lệ');
    }

    return this.issueToken(user);
  }

  async signInWithGoogle(credential: string) {
    const subject = await verifyGoogleToken(credential, this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'));
    const result = await this.databaseService.query<UserLoginRecord>(
      `SELECT TOP (1) u.IdUser, u.UserName, u.Role
       FROM dbo.UserExternalIdentity AS i
       JOIN dbo.[User] AS u ON u.IdUser = i.IdUser
       WHERE i.Provider = 'google' AND i.Subject = @subject`,
      { subject },
    );
    const user = result.recordset[0];
    if (!user) throw new UnauthorizedException('Tài khoản Google chưa được liên kết. Hãy đăng nhập bằng mật khẩu rồi liên kết trong trang Tài khoản.');
    return { ...await this.issueToken(user), username: user.UserName };
  }

  async linkGoogle(userId: string, credential: string) {
    const subject = await verifyGoogleToken(credential, this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'));
    if (!/^\d+$/.test(userId)) throw new UnauthorizedException();
    try {
      const result = await this.databaseService.query(
        `INSERT INTO dbo.UserExternalIdentity (IdUser, Provider, Subject)
         SELECT IdUser, 'google', @subject FROM dbo.[User] WHERE IdUser = @userId`,
        { subject, userId: Number(userId) },
      );
      if (result.rowsAffected[0] !== 1) throw new UnauthorizedException('Tài khoản không tồn tại');
      return { message: 'Đã liên kết tài khoản Google' };
    } catch (error) {
      const sql = error as { number?: number; originalError?: { info?: { number?: number } } };
      if ([2601, 2627].includes(sql?.number ?? sql?.originalError?.info?.number ?? 0)) {
        throw new ConflictException('Tài khoản này hoặc Google đã được liên kết');
      }
      throw error;
    }
  }

  private async issueToken(user: Pick<UserLoginRecord, 'IdUser' | 'UserName' | 'Role'>) {
    if (user.Role !== 'admin' && user.Role !== 'student') {
      throw new ForbiddenException('Tài khoản chưa được gán vai trò hợp lệ. Vui lòng liên hệ quản trị viên.');
    }
    const payload = {
      sub: String(user.IdUser), username: user.UserName, role: user.Role,
      ...(user.Role === 'student' ? { maSV: user.UserName } : {}),
    };
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
