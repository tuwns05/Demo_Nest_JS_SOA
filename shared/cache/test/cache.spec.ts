import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { CacheService, cacheOptions } from '../src/index.js';
import { FakeRedis } from './fake-redis.js';
import { RELEASE } from '../src/scripts.js';

describe('Distributed cache (shared Redis, independent instances)', () => {
  let redis: FakeRedis;
  let cache: CacheService;
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    redis = new FakeRedis();
    cache = new CacheService(redis, { ...cacheOptions(), jitterMs: 0, waitMs: 1000 });
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('miss loads SQL once, hit reads JSON and TTL expires', async () => {
    vi.useFakeTimers();
    const sql = vi.fn().mockResolvedValue({ MaDT: 1 });
    expect(await cache.remember('detai', '1', 'detail', sql)).toEqual({ MaDT: 1 });
    expect(await cache.remember('detai', '1', 'detail', sql)).toEqual({ MaDT: 1 });
    expect(sql).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60001);
    await cache.remember('detai', '1', 'detail', sql);
    expect(sql).toHaveBeenCalledTimes(2);
  });

  it('100 independent service instances make one SQL call for a cold key', async () => {
    const sql = vi.fn(async () => { await new Promise(resolve => setTimeout(resolve, 30)); return [{ MaDT: 1 }]; });
    const results = await Promise.all(Array.from({ length: 100 }, () =>
      new CacheService(redis, cache.options).remember('detai', 'all', 'list', sql)));
    expect(sql).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(100);
    expect(results.every(value => value[0].MaDT === 1)).toBe(true);
  });

  it('different keys load in parallel', async () => {
    let release!: () => void;
    const barrier = new Promise<void>(resolve => { release = resolve; });
    const sql = vi.fn(async () => { await barrier; return {}; });
    const a = cache.remember('detai', '1', 'detail', sql);
    const b = cache.remember('detai', '2', 'detail', sql);
    await vi.waitFor(() => expect(sql).toHaveBeenCalledTimes(2));
    release(); await Promise.all([a, b]);
  });

  it('preserves business errors and releases the lock without caching errors', async () => {
    const error = new NotFoundException('missing');
    await expect(cache.remember('detai', '1', 'detail', async () => { throw error; })).rejects.toBe(error);
    expect(redis.get('soa:detai:detail:1:lock')).toBeNull();
    expect(redis.get('soa:detai:detail:1')).toBeNull();
    const sqlError = new Error('SQL failed');
    await expect(cache.remember('detai', '1', 'detail', async () => { throw sqlError; })).rejects.toBe(sqlError);
  });

  it('expired owner cannot release another token', async () => {
    redis.put('lock', 'new-owner');
    expect(await redis.eval(RELEASE, 1, 'lock', 'old-owner')).toBe(0);
    expect(redis.get('lock')).toBe('new-owner');
  });

  it('renews a slow loader beyond the original lease', async () => {
    vi.useFakeTimers();
    cache = new CacheService(redis, { ...cache.options, lockMs: 300 });
    const result = cache.remember('detai', '1', 'detail', async () => {
      await new Promise(resolve => setTimeout(resolve, 800)); return { MaDT: 1 };
    });
    await vi.advanceTimersByTimeAsync(600);
    expect(redis.get('soa:detai:detail:1:lock')).not.toBeNull();
    await vi.advanceTimersByTimeAsync(200);
    await expect(result).resolves.toEqual({ MaDT: 1 });
  });

  it('lost ownership prevents old publishing and leaves the new lock intact', async () => {
    cache = new CacheService(redis, { ...cache.options, retries: 1 });
    await expect(cache.remember('detai', '1', 'detail', async () => {
      redis.put('soa:detai:detail:1:lock', 'new-owner'); return { old: true };
    })).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(redis.get('soa:detai:detail:1')).toBeNull();
    expect(redis.get('soa:detai:detail:1:lock')).toBe('new-owner');
  });

  it('bounds wait and never falls back to SQL', async () => {
    redis.put('soa:detai:detail:1:lock', 'other');
    cache = new CacheService(redis, { ...cache.options, waitMs: 50 });
    const sql = vi.fn();
    await expect(cache.remember('detai', '1', 'detail', sql)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(sql).not.toHaveBeenCalled();
  });

  it('Redis outage fails reads closed but does not turn a committed write into an error', async () => {
    redis.unavailable = true;
    const sql = vi.fn();
    await expect(cache.remember('detai', '1', 'detail', sql)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(sql).not.toHaveBeenCalled();
    await expect(cache.invalidate('detai', 1)).resolves.toBeUndefined();
  });

  it('invalidation during loading rejects the old generation and reloads', async () => {
    const sql = vi.fn().mockImplementationOnce(async () => {
      await cache.invalidate('detai', 1); return { TenDT: 'old' };
    }).mockResolvedValue({ TenDT: 'new' });
    expect(await cache.remember('detai', '1', 'detail', sql)).toEqual({ TenDT: 'new' });
    expect(sql).toHaveBeenCalledTimes(2);
    expect(await cache.remember('detai', '1', 'detail', sql)).toEqual({ TenDT: 'new' });
  });

  it('invalidates list and every detail alias logically, preserving another service', async () => {
    const sql = vi.fn().mockResolvedValue({ value: 'old' });
    for (const id of ['SV001', 'sv001']) await cache.remember('sinhvien', id, 'detail', sql);
    await cache.remember('sinhvien', 'all', 'list', sql);
    await cache.remember('detai', '1', 'detail', sql);
    await cache.invalidate('sinhvien', 'SV001');
    sql.mockResolvedValue({ value: 'new' });
    expect(await cache.remember('sinhvien', 'sv001', 'detail', sql)).toEqual({ value: 'new' });
    expect(await cache.remember('sinhvien', 'all', 'list', sql)).toEqual({ value: 'new' });
    expect(await cache.remember('detai', '1', 'detail', sql)).toEqual({ value: 'old' });
  });
});
