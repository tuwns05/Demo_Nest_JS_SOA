import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@soa/database';
import { CreateSinhVienDto } from './dto/create-sinhvien.dto.js';

@Injectable()
export class AppService {
  constructor(private readonly databaseService: DatabaseService) { }

  //CREATE SINHVIEN
  async create(dto: CreateSinhVienDto) {
    const check = await this.databaseService.query(
      'SELECT MaSV FROM SINHVIEN WHERE MaSV = @maSV',
      { maSV: dto.maSV },
    );

    if (check.recordset.length > 0) {
      throw new ConflictException(`Sinh viên ${dto.maSV} đã tồn tại`);
    }

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
    const sinhVien = await this.findOne(dto.maSV);
    return {
      message: 'Thêm sinh viên thành công',
      data: sinhVien
    }
  }

  //FIND SINHVIEN (MASV)
  async findOne(maSV: string) {
    const result = await this.databaseService.query(
      'SELECT MaSV, HoTen, Email, Lop FROM SINHVIEN WHERE MaSV = @maSV',
      { maSV },
    );

    const sinhVien = result.recordset[0];
    if (!sinhVien) {
      throw new NotFoundException(`Không tìm thấy sinh viên `);
    }

    return sinhVien;
  }


  async getHealth(): Promise<{ status: string; service: string; message?: string }> {
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
        message: error instanceof Error ? error.message : 'database unavailable',
      };
    }
  }

}
