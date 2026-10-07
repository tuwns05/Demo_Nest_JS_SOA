import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly http: HttpService, private readonly config: ConfigService) {}
  async getHealth() {
    const entries = await Promise.all(['auth', 'sinhvien', 'detai', 'dangky'].map(async name => {
      try {
        const base = this.config.getOrThrow<string>(`SERVICE_URL_${name.toUpperCase()}`);
        const response = await this.http.axiosRef.get(`${base.replace(/\/$/, '')}/${name}/health`, {
          timeout: 2000, maxRedirects: 0,
        });
        return [name, response.status === 200 ? 'up' : 'down'] as const;
      } catch {
        return [name, 'down'] as const;
      }
    }));
    return {
      status: entries.every(([, state]) => state === 'up') ? 'ok' : 'degraded',
      gateway: 'up', services: Object.fromEntries(entries), timestamp: new Date().toISOString(),
    };
  }
}
