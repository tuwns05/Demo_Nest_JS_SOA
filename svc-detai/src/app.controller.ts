import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { AppService } from './app.service.js';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from './public.decorator.js';

@Controller()
@ApiBearerAuth()
@ApiTags('Đề tài')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @Public()
  async getHealth(): Promise<{
    status: string;
    service: string;
    message?: string;
  }> {
    const health = await this.appService.getHealth();
    if (health.status === 'ok') {
      return health;
    }
    throw new ServiceUnavailableException(health);
  }
}
