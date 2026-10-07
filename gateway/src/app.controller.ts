import { All, Controller, Get, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { HttpService } from '@nestjs/axios';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @All(['*'])
  async proxy(@Req() request: Request, @Res() response: Response) {
    const requestPath = request.originalUrl || request.url;
    if (requestPath === '/health') {
      return response.status(200).json(await this.appService.getHealth());
    }

    const serviceMap = {
      auth: this.configService.get<string>('SERVICE_URL_AUTH', 'http://localhost:3004'),
      sinhvien: this.configService.get<string>('SERVICE_URL_SINHVIEN', 'http://localhost:3001'),
      detai: this.configService.get<string>('SERVICE_URL_DETAI', 'http://localhost:3002'),
      dangky: this.configService.get<string>('SERVICE_URL_DANGKY', 'http://localhost:3003'),
    } as const;

    const path = requestPath.replace(/^\/+/, '');
    const [resource, ...rest] = path.split('/');
    const baseUrl = serviceMap[resource as keyof typeof serviceMap];

    if (!baseUrl) {
      return response.status(404).json({
        statusCode: 404,
        message: `Unknown service route: ${resource}`,
        error: 'Not Found',
      });
    }

    const routePath = rest.length > 0 ? `${resource}/${rest.join('/')}` : resource;
    const targetUrl = new URL(`${baseUrl}/${routePath}`);
    const headers = { ...request.headers };
    delete headers.host;

    try {
      const axiosResponse = await this.httpService.axiosRef.request({
        url: targetUrl.toString(),
        method: request.method as any,
        headers,
        data: ['GET', 'DELETE'].includes(request.method) ? undefined : request.body,
        timeout: 5000,
      });

      return response.status(axiosResponse.status).json(axiosResponse.data);
    } catch (error: any) {
      const status = error.response?.status ?? 503;
      const payload = error.response?.data ?? {
        statusCode: 503,
        message: 'Service unavailable',
        error: 'Service Unavailable',
      };
      return response.status(status).json(payload);
    }
  }
}
