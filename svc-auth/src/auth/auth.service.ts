import { ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomInt } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '@soa/database';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { verifyGoogleIdentity } from './google-token.js';
import { EmailService } from './email.service.js';

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
    private readonly emailService: EmailService,
  ) {}

  private codeHash(purpose: string, target: string, code: string, email = ''): string {
    return createHmac('sha256', this.config.getOrThrow<string>('JWT_SECRET'))
      .update(`${purpose}\0${target}\0${email}\0${code}`).digest('hex');
  }

  private async sendVerificationCode(purpose: 'admin_register' | 'google_link', target: string, email: string) {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const hash = this.codeHash(purpose, target, code, email);
    const existing = await this.databaseService.query(
      `SELECT LastSentAt FROM dbo.EmailVerification WHERE Purpose = @purpose AND Target = @target`,
      { purpose, target },
    );
    const lastSentAt = existing.recordset[0]?.LastSentAt;
    if (lastSentAt && Date.now() - new Date(String(lastSentAt)).getTime() < 60_000) {
      throw new HttpException('Vui lòng chờ 60 giây trước khi gửi lại mã', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (existing.recordset.length) {
      await this.databaseService.query(
        `UPDATE dbo.EmailVerification SET CodeHash = @hash,
           ExpiresAt = DATEADD(minute, 10, SYSUTCDATETIME()), LastSentAt = SYSUTCDATETIME(),
           Attempts = 0, ConsumedAt = NULL
         WHERE Purpose = @purpose AND Target = @target`,
        { purpose, target, hash },
      );
    } else {
      try {
        await this.databaseService.query(
          `INSERT INTO dbo.EmailVerification (Purpose, Target, CodeHash, ExpiresAt, LastSentAt)
           VALUES (@purpose, @target, @hash, DATEADD(minute, 10, SYSUTCDATETIME()), SYSUTCDATETIME())`,
          { purpose, target, hash },
        );
      } catch (error) {
        const sql = error as { number?: number; originalError?: { info?: { number?: number } } };
        if ([2601, 2627].includes(sql?.number ?? sql?.originalError?.info?.number ?? 0)) {
          throw new HttpException('Vui lòng chờ 60 giây trước khi gửi lại mã', HttpStatus.TOO_MANY_REQUESTS);
        }
        throw error;
      }
    }
    await this.emailService.sendCode(email, code, purpose);
    return { message: 'Nếu địa chỉ email hợp lệ, mã xác thực đã được gửi.' };
  }

  private async consumeCode(purpose: 'admin_register' | 'google_link', target: string, code: string, email = '') {
    const hash = this.codeHash(purpose, target, code, email);
    const result = await this.databaseService.query(
      `UPDATE dbo.EmailVerification
       SET Attempts = Attempts + 1,
           ConsumedAt = CASE WHEN CodeHash = @hash THEN SYSUTCDATETIME() ELSE ConsumedAt END
       OUTPUT INSERTED.ConsumedAt
       WHERE Purpose = @purpose AND Target = @target AND ConsumedAt IS NULL
         AND ExpiresAt > SYSUTCDATETIME() AND Attempts < 5`,
      { purpose, target, hash },
    );
    if (!result.recordset[0]?.ConsumedAt) {
      throw new UnauthorizedException('Mã xác thực không đúng, đã hết hạn hoặc đã dùng');
    }
  }

  async requestAdminRegistration(email: string) {
    const normalized = email.trim().toLowerCase();
    const existing = await this.databaseService.query(
      'SELECT IdUser FROM dbo.[User] WHERE UserName = @email', { email: normalized },
    );
    if (existing.recordset.length) throw new ConflictException('Email này đã có tài khoản');
    return this.sendVerificationCode('admin_register', normalized, normalized);
  }

  async completeAdminRegistration(email: string, code: string, password: string) {
    const normalized = email.trim().toLowerCase();
    await this.consumeCode('admin_register', normalized, code, normalized);
    const hash = await bcrypt.hash(password, 12);
    try {
      await this.databaseService.query(
        `INSERT INTO dbo.[User] (UserName, Password, Role) VALUES (@email, @password, 'admin')`,
        { email: normalized, password: hash },
      );
    } catch (error) {
      const sql = error as { number?: number; originalError?: { info?: { number?: number } } };
      if ([2601, 2627].includes(sql?.number ?? sql?.originalError?.info?.number ?? 0)) {
        throw new ConflictException('Email này đã có tài khoản');
      }
      throw error;
    }
    return { message: 'Đăng ký thành công. Bạn có thể đăng nhập.', username: normalized };
  }

  private async studentEmail(authorization: string): Promise<string> {
    const base = this.config.get<string>('SERVICE_URL_SINHVIEN') ?? 'http://localhost:3001';
    try {
      const response = await fetch(`${base.replace(/\/$/, '')}/sinh-vien/me`, {
        headers: { Authorization: authorization }, signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error('student profile unavailable');
      const student = await response.json() as { Email?: string };
      if (!student.Email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.Email)) throw new Error('student email missing');
      return student.Email.trim().toLowerCase();
    } catch {
      throw new ServiceUnavailableException('Không lấy được email trong hồ sơ sinh viên');
    }
  }

  private async studentEmailByMaSV(maSV: string): Promise<string> {
    const serviceToken = await this.jwtService.signAsync(
      { sub: 'svc-auth', role: 'admin' }, { expiresIn: '30s' },
    );
    const base = this.config.get<string>('SERVICE_URL_SINHVIEN') ?? 'http://localhost:3001';
    try {
      const response = await fetch(`${base.replace(/\/$/, '')}/sinh-vien/${encodeURIComponent(maSV)}`, {
        headers: { Authorization: `Bearer ${serviceToken}` }, signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error('student profile unavailable');
      const student = await response.json() as { Email?: string };
      if (!student.Email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.Email)) throw new Error('student email missing');
      return student.Email.trim().toLowerCase();
    } catch {
      throw new ServiceUnavailableException('Không lấy được email trong hồ sơ sinh viên');
    }
  }

  async requestGoogleLink(userId: string, authorization: string) {
    if (!/^\d+$/.test(userId)) throw new UnauthorizedException();
    const email = await this.studentEmail(authorization);
    return this.sendVerificationCode('google_link', userId, email);
  }

  googleClientId() {
    return { clientId: this.config.get<string>('GOOGLE_CLIENT_ID') ?? '' };
  }

  async createStudentAccount(maSV: string, initialPassword: string) {
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

    const password = await bcrypt.hash(initialPassword, 12);
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
    const identity = await verifyGoogleIdentity(credential, this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'));
    const result = await this.databaseService.query<UserLoginRecord>(
      `SELECT TOP (1) u.IdUser, u.UserName, u.Role
       FROM dbo.UserExternalIdentity AS i
       JOIN dbo.[User] AS u ON u.IdUser = i.IdUser
       WHERE i.Provider = 'google' AND i.Subject = @subject`,
      { subject: identity.subject },
    );
    const user = result.recordset[0];
    if (!user) throw new UnauthorizedException('Tài khoản Google chưa được liên kết. Sinh viên đăng nhập bằng mã sinh viên rồi liên kết tại trang cá nhân.');
    if (user.Role === 'student') {
      const email = await this.studentEmailByMaSV(user.UserName);
      if (identity.email !== email) {
        throw new UnauthorizedException('Email Google không còn khớp hồ sơ sinh viên');
      }
    }
    return { ...await this.issueToken(user), username: user.UserName };
  }

  async linkGoogle(userId: string, authorization: string, credential: string, code: string) {
    const identity = await verifyGoogleIdentity(credential, this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'));
    if (!/^\d+$/.test(userId)) throw new UnauthorizedException();
    const email = await this.studentEmail(authorization);
    if (identity.email !== email) {
      throw new UnauthorizedException('Email Google phải trùng với email trong hồ sơ sinh viên đã được Google xác minh');
    }
    await this.consumeCode('google_link', userId, code, email);
    return this.insertGoogleLink(Number(userId), identity.subject);
  }

  private async insertGoogleLink(userId: number, subject: string) {
    try {
      const result = await this.databaseService.query(
        `INSERT INTO dbo.UserExternalIdentity (IdUser, Provider, Subject)
         SELECT IdUser, 'google', @subject FROM dbo.[User] WHERE IdUser = @userId`,
        { subject, userId },
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
