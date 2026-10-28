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
  Req,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CreateDangKyDto, UpdateDangKyDto, StudentDangKyDto } from './dto/dangky.dto.js';
import { AppService } from './app.service.js';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from './public.decorator.js';
import { Roles } from './roles.decorator.js';
import type { AuthenticatedRequest } from './auth.guard.js';

@Controller()
@ApiBearerAuth()
@ApiTags('Đăng ký')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('me')
  @Roles('student')
  findMine(@Req() request: AuthenticatedRequest) {
    return this.appService.findMine(request.user!.maSV!);
  }

  @Get('exists/student/:maSV')
  async hasRegistrationsForStudent(@Param('maSV') maSV: string) {
    return { exists: await this.appService.hasRegistrationsForStudent(maSV) };
  }

  @Get('exists/topic/:maDT')
  async hasRegistrationsForTopic(@Param('maDT', ParseIntPipe) maDT: number) {
    return { exists: await this.appService.hasRegistrationsForTopic(maDT) };
  }

  @Post('me')
  @Roles('student')
  createMine(
    @Body() dto: StudentDangKyDto,
    @Req() request: AuthenticatedRequest,
    @Headers('authorization') authorization: string,
  ) {
    return this.appService.create({
      maSV: request.user!.maSV!, maDT: dto.maDT, trangThai: 'Chờ duyệt',
    }, authorization);
  }

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
