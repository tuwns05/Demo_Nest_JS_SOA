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

  async occupiedTopicIds(): Promise<number[]> {
    const result = await this.databaseService.query<{ MaDT: number }>(
      'SELECT MaDT FROM dbo.DANGKY',
    );
    return result.recordset.map(row => Number(row.MaDT));
  }

  async registeredStudentIds(): Promise<string[]> {
    const result = await this.databaseService.query<{ MaSV: string }>(
      'SELECT DISTINCT MaSV FROM dbo.DANGKY',
    );
    return result.recordset.map(row => row.MaSV);
  }

  //CREATE
  async create(dto: CreateDangKyDto, authorization: string) {
    const [sinhVien, deTai] = await Promise.all([
      this.sinhVienClient.findById(dto.maSV, authorization),
      this.deTaiClient.findById(dto.maDT, authorization),
    ]);

    await this.checkDuplicate(dto.maSV, dto.maDT);
    let result;
    try {
      result = await this.databaseService.query(
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
    } catch (error) {
      const sqlError = error as { number?: number; message?: string; originalError?: { info?: { number?: number; message?: string } } };
      const number = sqlError?.number ?? sqlError?.originalError?.info?.number;
      if (number === 2601 || number === 2627) {
        const message = sqlError?.message ?? sqlError?.originalError?.info?.message ?? '';
        throw new ConflictException(message.includes('UQ_DANGKY_MaSV')
          ? 'Sinh viên đã đăng ký đề tài, không thể đăng ký thêm'
          : message.includes('UQ_DANGKY_MaDT')
            ? 'Đề tài đã có sinh viên đăng ký'
            : 'Sinh viên hoặc đề tài đã có đăng ký. Vui lòng tải lại danh sách.');
      }
      throw error;
    }
    return { message: 'Tạo đăng ký thành công', data: result.recordset[0] };
  }

  // Each student and each topic can belong to only one registration.
  private async checkDuplicate(maSV: string, maDT: number) {
    const result = await this.databaseService.query(
      `SELECT TOP (1) CASE WHEN MaSV = @maSV THEN 1 ELSE 0 END AS StudentRegistered
       FROM dbo.DANGKY WHERE MaSV = @maSV OR MaDT = @maDT
       ORDER BY CASE WHEN MaSV = @maSV THEN 0 ELSE 1 END`,
      { maSV, maDT },
    );

    if (result.recordset.length > 0) {
      throw new ConflictException(result.recordset[0].StudentRegistered
        ? 'Sinh viên đã đăng ký đề tài, không thể đăng ký thêm'
        : 'Đề tài đã có sinh viên đăng ký');
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

  async cancelMine(maDK: number, maSV: string) {
    const result = await this.databaseService.query(
      'DELETE FROM dbo.DANGKY OUTPUT deleted.MaDK WHERE MaDK = @maDK AND MaSV = @maSV',
      { maDK, maSV },
    );
    if (!result.recordset[0]) {
      throw new NotFoundException('Không tìm thấy đăng ký của bạn');
    }
    return { message: 'Hủy đăng ký thành công. Bạn có thể chọn đề tài khác.', data: result.recordset[0] };
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
