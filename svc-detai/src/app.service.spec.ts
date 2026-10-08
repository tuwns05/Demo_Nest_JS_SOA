import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@soa/database';
import { AppService } from './app.service.js';

describe('Topic CRUD', () => {
  const query = vi.fn();
  const service = new AppService({ query } as unknown as DatabaseService);
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('binds create values instead of inserting input into SQL', async () => {
    query.mockResolvedValue({ recordset: [{ MaDT: 1 }] });
    expect((await service.create({ tenDT: "Đề tài '" })).data).toEqual({
      MaDT: 1,
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('VALUES (@tenDT, @moTa, @giangVienHD)'),
      { tenDT: "Đề tài '", moTa: null, giangVienHD: null },
    );
  });

  it('updates only provided fields and supports clearing optional fields', async () => {
    query.mockResolvedValue({ recordset: [{ MaDT: 1, MoTa: null }] });
    await service.update(1, { moTa: null });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('SET MoTa = @moTa OUTPUT'),
      { maDT: 1, moTa: null },
    );
  });

  it('rejects empty updates', async () => {
    await expect(service.update(1, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(query).not.toHaveBeenCalled();
  });

  it('returns 404 when a record does not exist', async () => {
    query.mockResolvedValue({ recordset: [] });
    await expect(service.findOne(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.update(999, { tenDT: 'Missing' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove(999)).rejects.toBeInstanceOf(NotFoundException);
  });
});
