import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '@soa/database';
import { CreateSinhVienDto } from './dto/create-sinhvien.dto.js';
import { UpdateSinhVienDto } from './dto/update-sinhvien.dto.js';

function sqlErrorNumber(error: unknown): number | undefined {
  const sqlError = error as {
    number?: number;
    originalError?: { info?: { number?: number } };
  } | null;
  return sqlError?.number ?? sqlError?.originalError?.info?.number;
}

@Injectable()
export class AppService {
  constructor(private readonly databaseService: DatabaseService) {}

  //CREATE SINHVIEN
  async create(dto: CreateSinhVienDto) {
    const check = await this.databaseService.query(
      'SELECT MaSV FROM SINHVIEN WHERE MaSV = @maSV',
      { maSV: dto.maSV },
    );

    if (check.recordset.length > 0) {
      throw new ConflictException(`Sinh viên ${dto.maSV} đã tồn tại`);
    }

    try {
      await this.databaseService.query(
        `INSERT INTO SINHVIEN (MaSV, HoTen, Email, Lop, MatKhau)
     VALUES (@maSV, @hoTen, @email, @lop, @matKhau)`,
        {
          maSV: dto.maSV,
          hoTen: dto.hoTen,
          email: dto.email,
          lop: dto.lop,
          matKhau: dto.matKhau,
        },
      );
    } catch (error) {
      if ([2601, 2627].includes(sqlErrorNumber(error) ?? 0)) {
        throw new ConflictException(
          'Mã sinh viên hoặc thông tin duy nhất đã tồn tại',
        );
      }
      throw error;
    }
    const sinhVien = await this.findOne(dto.maSV);
    return {
      message: 'Thêm sinh viên thành công',
      data: sinhVien,
    };
  }

  async findAll() {
    const result = await this.databaseService.query(
      'SELECT MaSV, HoTen, Email, Lop FROM SINHVIEN ORDER BY MaSV',
    );
    return result.recordset;
  }

  //FIND SINHVIEN (MASV)
  async findOne(maSV: string) {
    const result = await this.databaseService.query(
      'SELECT MaSV, HoTen, Email, Lop FROM SINHVIEN WHERE MaSV = @maSV',
      { maSV },
    );

    const sinhVien = result.recordset[0];
    if (!sinhVien) {
      throw new NotFoundException(`Không tìm thấy sinh viên ${maSV}`);
    }

    return sinhVien;
  }

  async update(maSV: string, dto: UpdateSinhVienDto) {
    // Chỉ tên cột cố định được đưa vào SQL; mọi giá trị đều truyền qua tham số.
    const columns = {
      hoTen: 'HoTen',
      email: 'Email',
      lop: 'Lop',
      matKhau: 'MatKhau',
    };
    const assignments: string[] = [];
    const parameters: Record<string, unknown> = { maSV };
    for (const key of Object.keys(columns) as (keyof typeof columns)[]) {
      if (dto[key] !== undefined) {
        assignments.push(`${columns[key]} = @${key}`);
        parameters[key] = dto[key];
      }
    }
    if (assignments.length === 0) {
      throw new BadRequestException(
        'Cần cung cấp ít nhất một trường để cập nhật',
      );
    }

    try {
      const result = await this.databaseService.query(
        `UPDATE SINHVIEN SET ${assignments.join(', ')}
         OUTPUT INSERTED.MaSV, INSERTED.HoTen, INSERTED.Email, INSERTED.Lop
         WHERE MaSV = @maSV`,
        parameters,
      );
      if (!result.recordset[0]) {
        throw new NotFoundException(`Không tìm thấy sinh viên ${maSV}`);
      }
      return {
        message: 'Cập nhật sinh viên thành công',
        data: result.recordset[0],
      };
    } catch (error) {
      if ([2601, 2627].includes(sqlErrorNumber(error) ?? 0)) {
        throw new ConflictException('Thông tin sinh viên bị trùng');
      }
      throw error;
    }
  }

  async remove(maSV: string) {
    try {
      const result = await this.databaseService.query(
        `DELETE FROM SINHVIEN
         OUTPUT DELETED.MaSV, DELETED.HoTen, DELETED.Email, DELETED.Lop
         WHERE MaSV = @maSV`,
        { maSV },
      );
      if (!result.recordset[0]) {
        throw new NotFoundException(`Không tìm thấy sinh viên ${maSV}`);
      }
      return { message: 'Xóa sinh viên thành công', data: result.recordset[0] };
    } catch (error) {
      if (sqlErrorNumber(error) === 547) {
        throw new ConflictException(
          'Không thể xóa sinh viên đang có dữ liệu liên quan',
        );
      }
      throw error;
    }
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
        service: 'sinhvien',
      };
    } catch (error) {
      return {
        status: 'down',
        service: 'sinhvien',
        message:
          error instanceof Error ? error.message : 'database unavailable',
      };
    }
  }
}
