import { ConflictException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthClient {
  constructor(private readonly config: ConfigService) {}

  async createStudentAccount(maSV: string, initialPassword: string, authorization: string) {
    const base = this.config.get<string>('SERVICE_URL_AUTH') ?? 'http://localhost:3004';
    let response: Response;
    try {
      response = await fetch(`${base.replace(/\/$/, '')}/auth/accounts/student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authorization },
        body: JSON.stringify({ maSV, initialPassword }),
        signal: AbortSignal.timeout(3500),
        redirect: 'error',
      });
    } catch {
      throw new ServiceUnavailableException('Không kết nối được Auth để tạo tài khoản. Vui lòng thử lại.');
    }
    if (response.status === 409) {
      throw new ConflictException(`Tên tài khoản ${maSV} đã được sử dụng`);
    }
    if (response.status === 401 || response.status === 403) {
      throw new UnauthorizedException('Không thể tạo tài khoản. Vui lòng đăng nhập lại.');
    }
    if (!response.ok) {
      throw new ServiceUnavailableException('Auth chưa tạo được tài khoản. Vui lòng kiểm tra dịch vụ Auth và thử lại.');
    }
  }
}
