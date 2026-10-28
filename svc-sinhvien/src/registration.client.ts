import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RegistrationClient {
  constructor(private readonly config: ConfigService) {}

  async hasStudentRegistrations(maSV: string, authorization: string): Promise<boolean> {
    let response: Response;
    try {
      const base = this.config.getOrThrow<string>('SERVICE_URL_DANGKY').replace(/\/$/, '');
      response = await fetch(`${base}/dangky/exists/student/${encodeURIComponent(maSV)}`, {
        headers: { Authorization: authorization },
        signal: AbortSignal.timeout(3500),
        redirect: 'error',
      });
    } catch {
      throw new ServiceUnavailableException('Không kiểm tra được đăng ký của sinh viên');
    }
    if (response.status === 401 || response.status === 403)
      throw new UnauthorizedException('Không có quyền kiểm tra đăng ký. Vui lòng đăng nhập lại.');
    if (!response.ok) throw new ServiceUnavailableException('Không kiểm tra được đăng ký của sinh viên');
    try {
      const body = await response.json() as { exists?: unknown };
      if (typeof body.exists === 'boolean') return body.exists;
    } catch { /* Phản hồi không hợp lệ. */ }
    throw new ServiceUnavailableException('Phản hồi kiểm tra đăng ký không hợp lệ');
  }
}
