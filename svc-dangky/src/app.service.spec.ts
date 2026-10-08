import { BadRequestException, NotFoundException } from '@nestjs/common';
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
  });

  it('checks both references with the JWT before inserting', async () => {
    query.mockResolvedValue({ recordset: [{ MaDK: 5 }] });
    const result = await service.create(
      { maSV: 'SV001', maDT: 2 },
      'Bearer test',
    );
    expect(student.findById).toHaveBeenCalledWith('SV001', 'Bearer test');
    expect(topic.findById).toHaveBeenCalledWith(2, 'Bearer test');
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('CAST(GETDATE() AS date)'),
      expect.objectContaining({ maSV: 'SV001', maDT: 2 }),
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

  it('checks the resulting references on partial update and binds values', async () => {
    query
      .mockResolvedValueOnce({
        recordset: [{ MaDK: 1, MaSV: 'SV001', MaDT: 2 }],
      })
      .mockResolvedValueOnce({ recordset: [{ MaDK: 1, MaDT: 3 }] });
    await service.update(
      1,
      { maDT: 3, trangThai: "Đã duyệt '" },
      'Bearer test',
    );
    expect(student.findById).toHaveBeenCalledWith('SV001', 'Bearer test');
    expect(topic.findById).toHaveBeenCalledWith(3, 'Bearer test');
    expect(query).toHaveBeenLastCalledWith(
      expect.stringContaining('MaDT = @maDT, TrangThai = @trangThai'),
      { maDK: 1, maDT: 3, trangThai: "Đã duyệt '" },
    );
  });

  it('rejects empty updates without querying', async () => {
    await expect(service.update(1, {}, 'Bearer test')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(query).not.toHaveBeenCalled();
  });

  it('returns 404 for missing details and deletions', async () => {
    query.mockResolvedValue({ recordset: [] });
    await expect(service.findOne(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.remove(999)).rejects.toBeInstanceOf(NotFoundException);
  });
});
