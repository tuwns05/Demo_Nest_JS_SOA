import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { AppService } from './app.service.js';
import { ApiTags } from '@nestjs/swagger';

@Controller()
@ApiTags('Sinh viên')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  async getHealth(): Promise<{ status: string; service: string; message?: string }> {
    const health = await this.appService.getHealth();
    if (health.status === 'ok') {
      return health;
    }
    throw new ServiceUnavailableException(health);
  }
}
