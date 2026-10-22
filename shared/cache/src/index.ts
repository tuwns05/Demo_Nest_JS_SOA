import { Injectable, Logger, Module, ServiceUnavailableException } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { READ, PUBLISH, RELEASE, RENEW, INVALIDATE } from './scripts.js';

export interface CacheOptions {
  prefix: string; detailTtlMs: number; listTtlMs: number; jitterMs: number;
  lockMs: number; waitMs: number; retries: number; commandMs: number; maxLoadMs: number;
}

export function cacheOptions(): CacheOptions {
  const number = (key: string, fallback: number, min = 1) => {
    const value = Number(process.env[key] ?? fallback);
    if (!Number.isSafeInteger(value) || value < min || value > 2147483647)
      throw new Error(`Cấu hình ${key} không hợp lệ`);
    return value;
  };
  return {
    prefix: process.env.REDIS_KEY_PREFIX ?? 'soa:',
    detailTtlMs: number('CACHE_DETAIL_TTL_MS', 60000),
    listTtlMs: number('CACHE_LIST_TTL_MS', 30000),
    jitterMs: number('CACHE_JITTER_MS', 5000, 0),
    lockMs: number('CACHE_LOCK_MS', 10000, 300),
    waitMs: number('CACHE_WAIT_MS', 2000), retries: number('CACHE_RETRIES', 30),
    commandMs: number('REDIS_COMMAND_TIMEOUT_MS', 500),
    maxLoadMs: number('CACHE_MAX_LOAD_MS', 35000),
  };
}

export interface RedisPort {
  eval(script: string, count: number, ...args: (string | number)[]): Promise<unknown>;
  set(key: string, token: string, px: 'PX', ttl: number, nx: 'NX'): Promise<unknown>;
}

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: RedisPort;
  readonly options: CacheOptions;
  private ownedClient?: Redis;

  // Module factory supplies production client; explicit port allows deterministic tests.
  constructor(client?: RedisPort, options = cacheOptions()) {
    this.options = options;
    if (client) this.client = client;
    else {
      const redis = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379', {
        lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 0,
        autoResendUnfulfilledCommands: false,
        connectTimeout: options.commandMs, commandTimeout: options.commandMs,
        retryStrategy: times => Math.min(times * 100, 2000),
      });
      redis.on('error', () => this.logger.warn('REDIS_UNAVAILABLE'));
      this.client = this.ownedClient = redis;
      void redis.connect().catch(() => undefined);
    }
  }

  onModuleDestroy() { this.ownedClient?.disconnect(); }

  private async command<T>(operation: () => Promise<T>): Promise<T> {
    try { return await operation(); }
    catch {
      this.logger.warn('REDIS_UNAVAILABLE');
      throw new ServiceUnavailableException('Cache tạm thời không khả dụng');
    }
  }

  private async read(key: string, generationKey: string) {
    const result = await this.command(() => this.client.eval(READ, 2, key, generationKey));
    return result as [string, string | null];
  }

  async remember<T>(scope: string, resource: string, kind: 'detail' | 'list', loader: () => Promise<T>): Promise<T> {
    const key = `${this.options.prefix}${scope}:${kind}:${resource}`;
    const generationKey = `${this.options.prefix}${scope}:generation`;
    const lockKey = `${key}:lock`;
    const deadline = Date.now() + this.options.waitMs;
    for (let attempt = 0; attempt < this.options.retries && Date.now() < deadline; attempt++) {
      const [, cached] = await this.read(key, generationKey);
      if (cached !== null) {
        this.logger.debug(`CACHE_HIT ${scope}:${kind}`);
        return JSON.parse(cached) as T;
      }
      this.logger.debug(`CACHE_MISS ${scope}:${kind}`);
      const token = randomUUID();
      const acquired = await this.command(() => this.client.set(lockKey, token, 'PX', this.options.lockMs, 'NX'));
      if (acquired === 'OK') {
        this.logger.debug(`LOCK_ACQUIRED ${scope}:${kind}`);
        let lost = false;
        let stopped = false;
        const stopAt = Date.now() + this.options.maxLoadMs;
        let timer: ReturnType<typeof setTimeout>;
        const renew = async () => {
          if (stopped) return;
          if (Date.now() >= stopAt) { lost = true; return; }
          try {
            if (await this.client.eval(RENEW, 1, lockKey, token, this.options.lockMs) !== 1) lost = true;
          } catch { lost = true; }
          if (!lost && !stopped) timer = setTimeout(() => { void renew(); }, Math.floor(this.options.lockMs / 3));
        };
        timer = setTimeout(() => { void renew(); }, Math.floor(this.options.lockMs / 3));
        try {
          const [generation, second] = await this.read(key, generationKey);
          if (second !== null) return JSON.parse(second) as T;
          this.logger.debug(`CACHE_LOAD ${scope}:${kind}`);
          // Business errors propagate unchanged, including SQL errors and 404.
          const value = await loader();
          if (lost || Date.now() >= stopAt) throw new ServiceUnavailableException('Đã mất quyền tải cache');
          const ttl = (kind === 'detail' ? this.options.detailTtlMs : this.options.listTtlMs)
            + Math.floor(Math.random() * this.options.jitterMs);
          const published = await this.command(() => this.client.eval(PUBLISH, 3, key, lockKey, generationKey,
            token, generation, JSON.stringify({ generation, payload: JSON.stringify(value) }), ttl));
          if (published === 1) return value;
          // A writer invalidated this generation or ownership expired: never publish/return old data.
        } finally {
          stopped = true;
          clearTimeout(timer);
          await this.client.eval(RELEASE, 1, lockKey, token).catch(() => this.logger.warn('LOCK_RELEASE_FAILED'));
        }
      } else this.logger.debug(`LOCK_WAIT ${scope}:${kind}`);
      const remaining = deadline - Date.now();
      if (remaining > 0) await delay(Math.min(remaining, 20 * 2 ** Math.min(attempt, 3) + Math.random() * 30));
    }
    throw new ServiceUnavailableException('Cache đang bận, vui lòng thử lại');
  }

  async invalidate(scope: string, id: string | number): Promise<void> {
    const base = `${this.options.prefix}${scope}:`;
    try {
      await this.client.eval(INVALIDATE, 3, `${base}generation`, `${base}detail:${id}`, `${base}list:all`);
      this.logger.debug(`CACHE_INVALIDATED ${scope}`);
    } catch {
      // SQL already committed: do not report a failed write or retry account creation.
      // Remote caches may stay stale until their bounded TTL. See docs/redis-cache.md.
      this.logger.error(`CACHE_INVALIDATION_FAILED ${scope}`);
    }
  }
}

@Module({ providers: [{ provide: CacheService, useFactory: () => new CacheService() }], exports: [CacheService] })
export class RedisModule {}
