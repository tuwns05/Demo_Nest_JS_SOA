import { describe, it, expect } from 'vitest';
import { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import { CacheService, cacheOptions } from '../src/index.js';
import { RELEASE, PUBLISH } from '../src/scripts.js';

describe.skipIf(!process.env.REDIS_TEST_URL)('Real Redis / actual Lua', () => {
  it('100 requests across two clients, invalidation, owner checks', async () => {
    const clients = [new Redis(process.env.REDIS_TEST_URL!), new Redis(process.env.REDIS_TEST_URL!)];
    const options = { ...cacheOptions(), prefix: `test:${randomUUID()}:`, waitMs: 3000 };
    const services = clients.map(client => new CacheService(client, options));
    let queries = 0;
    const load = async () => { queries++; await new Promise(resolve => setTimeout(resolve, 50)); return { MaDT: 1 }; };
    const key = `${options.prefix}detai:detail:1`;
    try {
      await Promise.all(clients.map(client => client.ping()));
      const values = await Promise.all(Array.from({ length: 100 }, (_, i) => services[i % 2].remember('detai', '1', 'detail', load)));
      expect(queries).toBe(1); expect(values).toHaveLength(100);
      expect(await clients[0].pttl(key)).toBeGreaterThan(0);
      await services[0].invalidate('detai', 1);
      await services[1].remember('detai', '1', 'detail', load);
      expect(queries).toBe(2);
      await clients[0].set(`${key}:lock`, 'new', 'PX', 10000);
      expect(await clients[1].eval(RELEASE, 1, `${key}:lock`, 'old')).toBe(0);
      expect(await clients[1].eval(PUBLISH, 3, key, `${key}:lock`, `${options.prefix}detai:generation`, 'old', '1', '{}', 1000)).toBe(0);
      expect(await clients[0].get(`${key}:lock`)).toBe('new');
    } finally {
      await clients[0].del(key, `${key}:lock`, `${options.prefix}detai:generation`);
      clients.forEach(client => client.disconnect());
    }
  });
});
