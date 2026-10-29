import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@soa/database';
import { AppService } from './app.service.js';
import { SinhVienClient } from './clients/sinhvien.client.js';
import { DeTaiClient } from './clients/detai.client.js';

describe('Registration CRUD', () => {
  const query = vi.fn();
  const student = { findById: vi.fn() };
  const topic = { findById: vi.fn() };
  const service = new AppService(
    { query } as unknown as DatabaseService,
    student as unknown as SinhVienClient,
    topic as unknown as DeTaiClient,
  );
  beforeEach(() => {
    vi.resetAllMocks();
    student.findById.mockResolvedValue({ MaSV: 'SV001', HoTen: 'Nguyễn Văn A' });
    topic.findById.mockResolvedValue({ MaDT: 2, TenDT: 'Quản lý đồ án' });
  });

  it('checks both references with the JWT before inserting', async () => {
    query.mockResolvedValueOnce({ recordset: [] }).mockResolvedValueOnce({ recordset: [{ MaDK: 5 }] });
    const result = await service.create(
      { maSV: 'SV001', maDT: 2 },
      'Bearer test',
    );
    expect(student.findById).toHaveBeenCalledWith('SV001', 'Bearer test');
    expect(topic.findById).toHaveBeenCalledWith(2, 'Bearer test');
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('CAST(GETDATE() AS date)'),
      expect.objectContaining({
        maSV: 'SV001',
        hoTenSinhVien: 'Nguyễn Văn A',
        maDT: 2,
        tenDeTai: 'Quản lý đồ án',
      }),
    );
    expect(result.data).toEqual({ MaDK: 5 });
  });

  it.each(['student', 'topic'])(
    'does not insert when the %s does not exist',
    async (missing) => {
      (missing === 'student' ? student : topic).findById.mockRejectedValue(
        new NotFoundException(),
      );
      await expect(
        service.create({ maSV: 'missing', maDT: 8 }, 'Bearer test'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(query).not.toHaveBeenCalled();
    },
  );

  it('updates mutable fields without calling reference services', async () => {
    query.mockResolvedValueOnce({ recordset: [{ MaDK: 1, MaDT: 2 }] });
    await service.update(1, { trangThai: "Đã duyệt '" });
    expect(student.findById).not.toHaveBeenCalled();
    expect(topic.findById).not.toHaveBeenCalled();
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('TrangThai = @trangThai'),
      { maDK: 1, trangThai: "Đã duyệt '" },
    );
  });

  it('rejects empty updates without querying', async () => {
    await expect(service.update(1, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(query).not.toHaveBeenCalled();
  });

  it('filters registrations by the supplied authenticated student ID', async () => {
    const rows = [{ MaDK: 1, MaSV: 'SV001', MaDT: 2 }];
    query.mockResolvedValue({ recordset: rows });
    await expect(service.findMine('SV001')).resolves.toEqual(rows);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE MaSV = @maSV'), { maSV: 'SV001' });
  });

  it('checks registration existence by student and topic with bound parameters', async () => {
    query.mockResolvedValueOnce({ recordset: [{ MaDK: 1 }] })
      .mockResolvedValueOnce({ recordset: [] });
    await expect(service.hasRegistrationsForStudent('SV001')).resolves.toBe(true);
    await expect(service.hasRegistrationsForTopic(2)).resolves.toBe(false);
    expect(query).toHaveBeenNthCalledWith(1,
      expect.stringContaining('WHERE MaSV = @maSV'), { maSV: 'SV001' });
    expect(query).toHaveBeenNthCalledWith(2,
      expect.stringContaining('WHERE MaDT = @maDT'), { maDT: 2 });
  });

  it('rejects duplicate registrations before inserting', async () => {
    query.mockResolvedValueOnce({ recordset: [{ MaDK: 1 }] });
    await expect(service.create({ maSV: 'SV001', maDT: 2 }, 'Bearer test')).rejects.toBeInstanceOf(ConflictException);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('returns 404 for missing details and deletions', async () => {
    query.mockResolvedValue({ recordset: [] });
    await expect(service.findOne(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.remove(999)).rejects.toBeInstanceOf(NotFoundException);
  });
});
