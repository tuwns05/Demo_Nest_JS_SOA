import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException
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
  ) { }

  async findAll() {
    const result = await this.databaseService.query(
      'SELECT MaDK, MaSV, HoTenSinhVien, MaDT, TenDeTai, NgayDangKy, TrangThai FROM dbo.DANGKY ORDER BY MaDK DESC',
    );
    return result.recordset;
  }

  async findOne(maDK: number) {
    const result = await this.databaseService.query(
      'SELECT MaDK, MaSV, HoTenSinhVien, MaDT, TenDeTai, NgayDangKy, TrangThai FROM dbo.DANGKY WHERE MaDK = @maDK',
      { maDK },
    );
    if (!result.recordset[0])
      throw new NotFoundException('Không tìm thấy đăng ký');
    return result.recordset[0];
  }

  async findMine(maSV: string) {
    const result = await this.databaseService.query(
      'SELECT MaDK, MaSV, HoTenSinhVien, MaDT, TenDeTai, NgayDangKy, TrangThai FROM dbo.DANGKY WHERE MaSV = @maSV ORDER BY MaDK DESC',
      { maSV },
    );
    return result.recordset;
  }

  async hasRegistrationsForStudent(maSV: string): Promise<boolean> {
    const result = await this.databaseService.query(
      'SELECT TOP (1) MaDK FROM dbo.DANGKY WHERE MaSV = @maSV',
      { maSV },
    );
    return result.recordset.length > 0;
  }

  async hasRegistrationsForTopic(maDT: number): Promise<boolean> {
    const result = await this.databaseService.query(
      'SELECT TOP (1) MaDK FROM dbo.DANGKY WHERE MaDT = @maDT',
      { maDT },
    );
    return result.recordset.length > 0;
  }

  //CREATE
  async create(dto: CreateDangKyDto, authorization: string) {
    const [sinhVien, deTai] = await Promise.all([
      this.sinhVienClient.findById(dto.maSV, authorization),
      this.deTaiClient.findById(dto.maDT, authorization),
    ]);

    await this.checkDuplicate(dto.maSV, dto.maDT);
    const result = await this.databaseService.query(
      'INSERT INTO dbo.DANGKY (MaSV, HoTenSinhVien, MaDT, TenDeTai, NgayDangKy, TrangThai) OUTPUT inserted.MaDK, inserted.MaSV, inserted.HoTenSinhVien, inserted.MaDT, inserted.TenDeTai, inserted.NgayDangKy, inserted.TrangThai VALUES (@maSV, @hoTenSinhVien, @maDT, @tenDeTai, ' +
      (dto.ngayDangKy === undefined
        ? 'CAST(GETDATE() AS date)'
        : '@ngayDangKy') +
      ', @trangThai)',
      {
        maSV: dto.maSV,
        hoTenSinhVien: sinhVien.HoTen,
        maDT: dto.maDT,
        tenDeTai: deTai.TenDT,
        ngayDangKy: dto.ngayDangKy ?? null,
        trangThai: dto.trangThai ?? null,
      },
    );
    return { message: 'Tạo đăng ký thành công', data: result.recordset[0] };
  }

  //Check sinh viên đã đăng ký đề tài đó hay chưa
  private async checkDuplicate(maSV: string, maDT: number) {
    const result = await this.databaseService.query(
      `SELECT TOP 1 MaDK FROM dbo.DANGKY
     WHERE MaSV = @maSV AND MaDT = @maDT`,
      { maSV, maDT },
    );

    if (result.recordset.length > 0) {
      throw new ConflictException('Sinh viên đã đăng ký đề tài này');
    }
  }

  //UPDATE 
  async update(maDK: number, dto: UpdateDangKyDto) {
    const fields = {
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
    const result = await this.databaseService.query(
      `UPDATE dbo.DANGKY SET ${assignments.join(', ')} OUTPUT inserted.MaDK, inserted.MaSV, inserted.HoTenSinhVien, inserted.MaDT, inserted.TenDeTai, inserted.NgayDangKy, inserted.TrangThai WHERE MaDK = @maDK`,
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
