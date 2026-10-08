import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '@soa/database';
import { SinhVienClient } from './clients/sinhvien.client.js';
import { DeTaiClient } from './clients/detai.client.js';
import { CreateDangKyDto, UpdateDangKyDto } from './dto/dangky.dto.js';

@Injectable()
export class AppService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly sinhVienClient: SinhVienClient,
    private readonly deTaiClient: DeTaiClient,
  ) {}

  async findAll() {
    const result = await this.databaseService.query(
      'SELECT MaDK, MaSV, MaDT, NgayDangKy, TrangThai FROM dbo.DANGKY ORDER BY MaDK DESC',
    );
    return result.recordset;
  }

  async findOne(maDK: number) {
    const result = await this.databaseService.query(
      'SELECT MaDK, MaSV, MaDT, NgayDangKy, TrangThai FROM dbo.DANGKY WHERE MaDK = @maDK',
      { maDK },
    );
    if (!result.recordset[0])
      throw new NotFoundException('Không tìm thấy đăng ký');
    return result.recordset[0];
  }

  private async checkReferences(
    maSV: string,
    maDT: number,
    authorization: string,
  ) {
    await this.sinhVienClient.findById(maSV, authorization);
    await this.deTaiClient.findById(maDT, authorization);
  }

  async create(dto: CreateDangKyDto, authorization: string) {
    await this.checkReferences(dto.maSV, dto.maDT, authorization);
    const result = await this.databaseService.query(
      'INSERT INTO dbo.DANGKY (MaSV, MaDT, NgayDangKy, TrangThai) OUTPUT inserted.MaDK, inserted.MaSV, inserted.MaDT, inserted.NgayDangKy, inserted.TrangThai VALUES (@maSV, @maDT, ' +
        (dto.ngayDangKy === undefined
          ? 'CAST(GETDATE() AS date)'
          : '@ngayDangKy') +
        ', @trangThai)',
      {
        maSV: dto.maSV,
        maDT: dto.maDT,
        ngayDangKy: dto.ngayDangKy ?? null,
        trangThai: dto.trangThai ?? null,
      },
    );
    return { message: 'Tạo đăng ký thành công', data: result.recordset[0] };
  }

  async update(maDK: number, dto: UpdateDangKyDto, authorization: string) {
    const fields = {
      maSV: 'MaSV',
      maDT: 'MaDT',
      ngayDangKy: 'NgayDangKy',
      trangThai: 'TrangThai',
    };
    const parameters: Record<string, unknown> = { maDK };
    const assignments: string[] = [];
    for (const key of Object.keys(fields) as (keyof typeof fields)[]) {
      if (dto[key] !== undefined) {
        assignments.push(`${fields[key]} = @${key}`);
        parameters[key] = dto[key];
      }
    }
    if (!assignments.length)
      throw new BadRequestException('Cần ít nhất một trường để cập nhật');
    const current = await this.findOne(maDK);
    await this.checkReferences(
      dto.maSV ?? String(current.MaSV),
      dto.maDT ?? Number(current.MaDT),
      authorization,
    );
    const result = await this.databaseService.query(
      `UPDATE dbo.DANGKY SET ${assignments.join(', ')} OUTPUT inserted.MaDK, inserted.MaSV, inserted.MaDT, inserted.NgayDangKy, inserted.TrangThai WHERE MaDK = @maDK`,
      parameters,
    );
    if (!result.recordset[0])
      throw new NotFoundException('Không tìm thấy đăng ký');
    return {
      message: 'Cập nhật đăng ký thành công',
      data: result.recordset[0],
    };
  }

  async remove(maDK: number) {
    const result = await this.databaseService.query(
      'DELETE FROM dbo.DANGKY OUTPUT deleted.MaDK WHERE MaDK = @maDK',
      { maDK },
    );
    if (!result.recordset[0])
      throw new NotFoundException('Không tìm thấy đăng ký');
    return { message: 'Xóa đăng ký thành công', data: result.recordset[0] };
  }

  async getHealth(): Promise<{
    status: string;
    service: string;
    message?: string;
  }> {
    try {
      await this.databaseService.query('SELECT 1 AS result');
      return {
        status: 'ok',
        service: 'dangky',
      };
    } catch (error) {
      return {
        status: 'down',
        service: 'dangky',
        message:
          error instanceof Error ? error.message : 'database unavailable',
      };
    }
  }
}
