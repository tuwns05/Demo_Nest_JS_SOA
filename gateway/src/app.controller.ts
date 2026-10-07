import { All, Controller, Get, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { HttpService } from '@nestjs/axios';
import { AppService } from './app.service.js';
import type { AuthenticatedRequest } from './auth.guard.js';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  @Get('health')
  async getHealth(@Res() response: Response) {
    const health = await this.appService.getHealth();
    return response.status(health.status === 'ok' ? 200 : 503).json(health);
  }

  @All('{*path}')
  async proxy(@Req() request: AuthenticatedRequest, @Res() response: Response) {
    const resource = request.path.split('/')[1];
    if (!['auth', 'sinhvien', 'detai', 'dangky'].includes(resource)) {
      return response.status(404).json({ statusCode: 404, message: `Unknown service route: ${resource}` });
    }
    const base = this.config.getOrThrow<string>(`SERVICE_URL_${resource.toUpperCase()}`);
    const targetUrl = `${base.replace(/\/$/, '')}${request.originalUrl}`;
    delete request.headers['x-user-id'];
    const headers: Record<string, string> = {};
    for (const name of ['content-type', 'accept', 'authorization']) {
      const value = request.headers[name];
      if (typeof value === 'string') headers[name] = value;
    }
    if (request.user) headers['x-user-id'] = String(request.user.sub);
    try {
      const upstream = await this.http.axiosRef.request({
        url: targetUrl, method: request.method, headers,
        data: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        timeout: 5000, maxRedirects: 0, validateStatus: () => true,
      });
      return response.status(upstream.status).send(upstream.data);
    } catch {
      return response.status(503).json({ statusCode: 503, message: 'Dịch vụ tạm thời không khả dụng' });
    }
  }
}
