import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '@soa/database';
import { CreateDeTaiDto, UpdateDeTaiDto } from './dto/detai.dto.js';

@Injectable()
export class AppService {
  constructor(private readonly databaseService: DatabaseService) {}

  async findAll() {
    const result = await this.databaseService.query(
      'SELECT MaDT, TenDT, MoTa, GiangVienHD FROM dbo.DETAI ORDER BY MaDT DESC',
    );
    return result.recordset;
  }

  async findOne(maDT: number) {
    const result = await this.databaseService.query(
      'SELECT MaDT, TenDT, MoTa, GiangVienHD FROM dbo.DETAI WHERE MaDT = @maDT',
      { maDT },
    );
    if (!result.recordset[0])
      throw new NotFoundException('Không tìm thấy đề tài');
    return result.recordset[0];
  }

  async create(dto: CreateDeTaiDto) {
    const result = await this.databaseService.query(
      'INSERT INTO dbo.DETAI (TenDT, MoTa, GiangVienHD) OUTPUT inserted.MaDT, inserted.TenDT, inserted.MoTa, inserted.GiangVienHD VALUES (@tenDT, @moTa, @giangVienHD)',
      {
        tenDT: dto.tenDT,
        moTa: dto.moTa ?? null,
        giangVienHD: dto.giangVienHD ?? null,
      },
    );
    return { message: 'Tạo đề tài thành công', data: result.recordset[0] };
  }

  async update(maDT: number, dto: UpdateDeTaiDto) {
    const fields = { tenDT: 'TenDT', moTa: 'MoTa', giangVienHD: 'GiangVienHD' };
    const parameters: Record<string, unknown> = { maDT };
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
      `UPDATE dbo.DETAI SET ${assignments.join(', ')} OUTPUT inserted.MaDT, inserted.TenDT, inserted.MoTa, inserted.GiangVienHD WHERE MaDT = @maDT`,
      parameters,
    );
    if (!result.recordset[0])
      throw new NotFoundException('Không tìm thấy đề tài');
    return { message: 'Cập nhật đề tài thành công', data: result.recordset[0] };
  }

  async remove(maDT: number) {
    const result = await this.databaseService.query(
      'DELETE FROM dbo.DETAI OUTPUT deleted.MaDT WHERE MaDT = @maDT',
      { maDT },
    );
    if (!result.recordset[0])
      throw new NotFoundException('Không tìm thấy đề tài');
    return { message: 'Xóa đề tài thành công', data: result.recordset[0] };
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
        service: 'detai',
      };
    } catch (error) {
      return {
        status: 'down',
        service: 'detai',
        message:
          error instanceof Error ? error.message : 'database unavailable',
      };
    }
  }
}
