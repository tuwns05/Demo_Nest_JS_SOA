import { Body, Controller, Get, Post, ServiceUnavailableException } from '@nestjs/common';
import { AppService } from './app.service.js';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from './public.decorator.js';
import { CreateSinhVienDto } from './dto/create-sinhvien.dto.js';

@Controller('sinh-vien')
@ApiTags('Sinh viên')
export class AppController {
  constructor(private readonly appService: AppService, private readonly sinhVienService: AppService) { }

  @Get('health')
  @Public()
  async getHealth(): Promise<{ status: string; service: string; message?: string }> {
    const health = await this.appService.getHealth();
    if (health.status === 'ok') {
      return health;
    }
    throw new ServiceUnavailableException(health);
  }

  @Post('create')
  @ApiBearerAuth()
  async create(@Body() dto: CreateSinhVienDto) {
    return this.sinhVienService.create(dto);
  }
}
