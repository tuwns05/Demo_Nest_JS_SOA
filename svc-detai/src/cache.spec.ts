import { NotFoundException } from '@nestjs/common';
import { CacheService } from '@soa/cache';
import { DatabaseService } from '@soa/database';
import { AppService } from './app.service.js';

describe('Detai cache integration with CRUD', () => {
  const query = vi.fn();
  const entries = new Map<string, unknown>();
  const invalidate = vi.fn(async () => { entries.clear(); });
  const service = new AppService({ query } as unknown as DatabaseService, {
    remember: async (scope: string, id: string, kind: string, loader: () => Promise<unknown>) => {
      const key = `${scope}:${kind}:${id}`;
      if (!entries.has(key)) entries.set(key, await loader());
      return entries.get(key);
    }, invalidate,
  } as unknown as CacheService);
  beforeEach(() => { entries.clear(); vi.resetAllMocks(); invalidate.mockImplementation(async () => { entries.clear(); }); });

  it('miss/hit, update invalidation and delete followed by 404', async () => {
    query.mockResolvedValue({ recordset: [{ MaDT: 1, TenDT: 'Old' }] });
    await service.findOne(1); await service.findOne(1);
    await service.findAll(); await service.findAll();
    expect(query).toHaveBeenCalledTimes(2);
    query.mockResolvedValue({ recordset: [{ MaDT: 1, TenDT: 'New' }] });
    await service.update(1, { tenDT: 'New' });
    expect(invalidate).toHaveBeenCalledWith('detai', 1);
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect((await service.findOne(1)).TenDT).toBe('New');
    await service.remove(1);
    expect(invalidate).toHaveBeenCalledTimes(2);
    query.mockResolvedValue({ recordset: [] });
    await expect(service.findOne(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create refreshes list; invalidation occurs after SQL finishes', async () => {
    query.mockResolvedValue({ recordset: [] }); await service.findAll();
    query.mockImplementationOnce(async () => {
      expect(invalidate).not.toHaveBeenCalled(); return { recordset: [{ MaDT: 1 }] };
    }).mockResolvedValue({ recordset: [{ MaDT: 1 }] });
    await service.create({ tenDT: 'New' });
    expect(invalidate).toHaveBeenCalledWith('detai', '1');
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(await service.findAll()).toEqual([{ MaDT: 1 }]);
  });

  it('does not invalidate on failed SQL writes or missing rows', async () => {
    const failure = new Error('SQL'); query.mockRejectedValueOnce(failure);
    await expect(service.create({ tenDT: 'New' })).rejects.toBe(failure);
    query.mockResolvedValue({ recordset: [] });
    await expect(service.update(1, { tenDT: 'New' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove(1)).rejects.toBeInstanceOf(NotFoundException);
    expect(invalidate).not.toHaveBeenCalled();
  });
});
