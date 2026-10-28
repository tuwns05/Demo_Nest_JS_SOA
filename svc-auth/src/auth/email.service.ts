import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  constructor(private readonly config: ConfigService) {}

  async sendCode(address: string, code: string, purpose: 'admin_register' | 'google_link') {
    const host = this.config.get<string>('SMTP_HOST');
    const from = this.config.get<string>('SMTP_FROM');
    if (!host || !from) throw new ServiceUnavailableException('Chưa cấu hình máy chủ gửi email');
    const port = Number(this.config.get<string>('SMTP_PORT') ?? '587');
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new ServiceUnavailableException('Cổng SMTP không hợp lệ');
    }
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASSWORD');
    const transport = nodemailer.createTransport({
      host, port, secure: port === 465, requireTLS: port !== 465,
      auth: user && pass ? { user, pass } : undefined,
      connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 10000,
    });
    try {
      await transport.sendMail({
        from, to: address,
        subject: purpose === 'admin_register' ? 'Mã đăng ký quản trị viên' : 'Mã liên kết Google',
        text: `Mã xác thực của bạn là ${code}. Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.`,
      });
    } catch {
      throw new ServiceUnavailableException('Không gửi được email xác thực. Vui lòng thử lại sau.');
    } finally {
      transport.close();
    }
  }
}
