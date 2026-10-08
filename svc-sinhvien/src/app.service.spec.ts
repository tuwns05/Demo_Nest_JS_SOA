import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '@soa/database';
import { AppService } from './app.service.js';

describe('Sinhvien CRUD', () => {
  const query = vi.fn();
  const service = new AppService({ query } as unknown as DatabaseService);
  const student = {
    MaSV: 'SV001',
    HoTen: 'Nguyễn Văn A',
    Email: 'a@example.com',
    Lop: 'CNTT01',
  };
  const dto = {
    maSV: 'SV001',
    hoTen: student.HoTen,
    email: student.Email,
    lop: student.Lop,
    matKhau: '123456',
  };
  beforeEach(() => {
    query.mockReset();
  });

  it('creates a student and returns public fields', async () => {
    query
      .mockResolvedValueOnce({ recordset: [] })
      .mockResolvedValueOnce({ recordset: [] })
      .mockResolvedValueOnce({ recordset: [student] });
    await expect(service.create(dto)).resolves.toEqual({
      message: 'Thêm sinh viên thành công',
      data: student,
    });
    expect(query.mock.calls[1][1]).toEqual(dto);
  });

  it('rejects duplicate IDs without inserting', async () => {
    query.mockResolvedValue({ recordset: [student] });
    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('handles duplicates inserted concurrently', async () => {
    query
      .mockResolvedValueOnce({ recordset: [] })
      .mockRejectedValueOnce({ number: 2627 });
    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists students without selecting passwords', async () => {
    query.mockResolvedValue({ recordset: [student] });
    await expect(service.findAll()).resolves.toEqual([student]);
    expect(query.mock.calls[0][0]).not.toMatch(/MatKhau|SELECT \*/i);
  });

  it('returns 404 for missing students', async () => {
    query.mockResolvedValue({ recordset: [] });
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.update('missing', { lop: 'CNTT02' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates only supplied fields and parameterizes user input', async () => {
    const hoTen = "O'Brien'; DROP TABLE SINHVIEN;--";
    query.mockResolvedValue({ recordset: [{ ...student, HoTen: hoTen }] });
    const result = await service.update('SV001', { hoTen });
    expect(result.data.HoTen).toBe(hoTen);
    const [sql, parameters] = query.mock.calls[0];
    expect(sql).toContain('SET HoTen = @hoTen');
    expect(sql).not.toContain(hoTen);
    expect(sql).not.toContain('MatKhau');
    expect(parameters).toEqual({ maSV: 'SV001', hoTen });
  });

  it('rejects empty updates without querying SQL', async () => {
    await expect(service.update('SV001', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(query).not.toHaveBeenCalled();
  });

  it('deletes and returns the deleted student', async () => {
    query.mockResolvedValue({ recordset: [student] });
    await expect(service.remove('SV001')).resolves.toEqual({
      message: 'Xóa sinh viên thành công',
      data: student,
    });
    expect(query.mock.calls[0][1]).toEqual({ maSV: 'SV001' });
  });

  it('returns conflict when a foreign key prevents deletion', async () => {
    query.mockRejectedValue({ originalError: { info: { number: 547 } } });
    await expect(service.remove('SV001')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('does not mask unexpected database failures', async () => {
    const error = new Error('connection lost');
    query.mockRejectedValue(error);
    await expect(service.remove('SV001')).rejects.toBe(error);
  });
});
