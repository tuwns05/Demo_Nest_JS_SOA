import { READ, PUBLISH, RELEASE, RENEW, INVALIDATE } from '../src/scripts.js';
import type { RedisPort } from '../src/index.js';

// Semantic test double, not a Lua interpreter. Integration suite runs the actual Lua.
export class FakeRedis implements RedisPort {
  values = new Map<string, { value: string; expires: number }>();
  unavailable = false;
  get(key: string) {
    const entry = this.values.get(key);
    if (!entry || entry.expires <= Date.now()) { this.values.delete(key); return null; }
    return entry.value;
  }
  put(key: string, value: string, ttl = Infinity) {
    this.values.set(key, { value, expires: Date.now() + ttl });
  }
  async set(key: string, token: string, _px: 'PX', ttl: number, _nx: 'NX') {
    if (this.unavailable) throw new Error('offline');
    if (this.get(key)) return null;
    this.put(key, token, ttl); return 'OK';
  }
  async eval(script: string, count: number, ...args: (string | number)[]) {
    if (this.unavailable) throw new Error('offline');
    const keys = args.slice(0, count).map(String);
    const values = args.slice(count).map(String);
    if (script === READ) {
      const generation = this.get(keys[1]) ?? '0';
      const raw = this.get(keys[0]);
      const entry = raw ? JSON.parse(raw) : null;
      return [generation, entry?.generation === generation ? entry.payload : null];
    }
    if (script === PUBLISH) {
      if (this.get(keys[1]) !== values[0] || (this.get(keys[2]) ?? '0') !== values[1]) return 0;
      this.put(keys[0], values[2], Number(values[3])); return 1;
    }
    if (script === RELEASE || script === RENEW) {
      if (this.get(keys[0]) !== values[0]) return 0;
      if (script === RELEASE) this.values.delete(keys[0]);
      else this.put(keys[0], values[0], Number(values[1]));
      return 1;
    }
    if (script === INVALIDATE) {
      this.put(keys[0], String(Number(this.get(keys[0]) ?? 0) + 1));
      keys.slice(1).forEach(key => this.values.delete(key)); return 1;
    }
    throw new Error('Unknown script');
  }
}
