import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CreateDangKyDto, UpdateDangKyDto } from './dto/dangky.dto.js';
import { AppService } from './app.service.js';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from './public.decorator.js';

@Controller()
@ApiBearerAuth()
@ApiTags('Đăng ký')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  findAll() {
    return this.appService.findAll();
  }

  @Post()
  create(
    @Body() dto: CreateDangKyDto,
    @Headers('authorization') authorization: string,
  ) {
    return this.appService.create(dto, authorization);
  }

  @Patch(':maDK')
  update(
    @Param('maDK', ParseIntPipe) maDK: number,
    @Body() dto: UpdateDangKyDto,
    @Headers('authorization') authorization: string,
  ) {
    return this.appService.update(maDK, dto, authorization);
  }

  @Delete(':maDK')
  remove(@Param('maDK', ParseIntPipe) maDK: number) {
    return this.appService.remove(maDK);
  }

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

  @Get(':maDK')
  findOne(@Param('maDK', ParseIntPipe) maDK: number) {
    return this.appService.findOne(maDK);
  }
}
