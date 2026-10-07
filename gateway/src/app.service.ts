import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AppService {
  constructor(private readonly httpService: HttpService) {}

  async getHealth(): Promise<Record<string, any>> {
    const urls = {
      auth: `${process.env.SERVICE_URL_AUTH ?? 'http://localhost:3004'}/auth/health`,
      sinhvien: `${process.env.SERVICE_URL_SINHVIEN ?? 'http://localhost:3001'}/sinhvien/health`,
      detai: `${process.env.SERVICE_URL_DETAI ?? 'http://localhost:3002'}/detai/health`,
      dangky: `${process.env.SERVICE_URL_DANGKY ?? 'http://localhost:3003'}/dangky/health`,
    };

    const services: Record<string, string> = {};
    for (const [name, url] of Object.entries(urls)) {
      try {
        const response = await firstValueFrom(
          this.httpService.get(url, { timeout: 5000 }),
        );
        services[name] = response.status === 200 ? 'up' : 'down';
      } catch {
        services[name] = 'down';
      }
    }

    return {
      status: 'ok',
      gateway: 'up',
      services,
      timestamp: new Date().toISOString(),
    };
  }
}
