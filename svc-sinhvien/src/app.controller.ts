import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AppService } from './app.service.js';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from './public.decorator.js';
import { CreateSinhVienDto } from './dto/create-sinhvien.dto.js';
import { UpdateSinhVienDto } from './dto/update-sinhvien.dto.js';

@Controller(['', 'sinh-vien'])
@ApiTags('Sinh viên')
@ApiBearerAuth()
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

  @Post(['', 'create'])
  async create(@Body() dto: CreateSinhVienDto) {
    return this.appService.create(dto);
  }

  @Get()
  findAll() {
    return this.appService.findAll();
  }

  @Get(':maSV')
  findOne(@Param('maSV') maSV: string) {
    return this.appService.findOne(maSV);
  }

  @Patch(':maSV')
  update(@Param('maSV') maSV: string, @Body() dto: UpdateSinhVienDto) {
    return this.appService.update(maSV, dto);
  }

  @Delete(':maSV')
  remove(@Param('maSV') maSV: string) {
    return this.appService.remove(maSV);
  }
}
