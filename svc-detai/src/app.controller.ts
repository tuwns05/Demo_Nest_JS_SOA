import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CreateDeTaiDto, UpdateDeTaiDto } from './dto/detai.dto.js';
import { AppService } from './app.service.js';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from './public.decorator.js';

@Controller()
@ApiBearerAuth()
@ApiTags('Đề tài')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  findAll() {
    return this.appService.findAll();
  }

  @Post()
  create(@Body() dto: CreateDeTaiDto) {
    return this.appService.create(dto);
  }

  @Patch(':maDT')
  update(
    @Param('maDT', ParseIntPipe) maDT: number,
    @Body() dto: UpdateDeTaiDto,
  ) {
    return this.appService.update(maDT, dto);
  }

  @Delete(':maDT')
  remove(@Param('maDT', ParseIntPipe) maDT: number) {
    return this.appService.remove(maDT);
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

  @Get(':maDT')
  findOne(@Param('maDT', ParseIntPipe) maDT: number) {
    return this.appService.findOne(maDT);
  }
}
