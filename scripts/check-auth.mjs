import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../svc-auth/package.json', import.meta.url));
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { JwtService } = require('@nestjs/jwt');
const bcrypt = require('bcryptjs');
const { DatabaseService } = await import('../shared/database/dist/index.js');
const hash = readFileSync(new URL('../db/seed.sql', import.meta.url), 'utf8').match(/\$2b\$12\$[^']+/)[0];
assert.equal(await bcrypt.compare('Demo@123456', hash), true);
assert.equal(await bcrypt.compare('wrong', hash), false);
process.env.JWT_SECRET = randomBytes(32).toString('hex');
process.env.JWT_EXPIRES_IN = '7m';
DatabaseService.prototype.onModuleInit = async function () {};
DatabaseService.prototype.onModuleDestroy = async function () {};
DatabaseService.prototype.query = async function (sql, params) {
  assert.ok(sql.includes('@username'));
  return { recordset: params.username === 'demo' ? [{ IdUser: 7, UserName: 'demo', Password: hash }] : [], rowsAffected: [] };
};
const { AppModule } = await import('../svc-auth/dist/app.module.js');
const app = await NestFactory.create(AppModule, { logger: false });
try {
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  const login = (username, password) => fetch(`${base}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ user: username, password }),
  });
  const response = await login('demo', 'Demo@123456');
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.expires_in, '7m');
  const jwt = new JwtService({ secret: process.env.JWT_SECRET });
  const decoded = await jwt.verifyAsync(payload.access_token);
  assert.equal(decoded.sub, '7');
  assert.equal(decoded.username, 'demo');
  assert.equal(decoded.maSV, undefined);
  assert.equal(decoded.exp - decoded.iat, 420);
  assert.equal((await login('demo', 'wrong')).status, 401);
  assert.equal((await login('unknown', 'wrong')).status, 401);
  assert.equal((await login('', '')).status, 400);
  assert.equal((await login('   ', 'password')).status, 400);
  assert.equal((await login('x'.repeat(101), 'password')).status, 400);
  const studentLogin = await fetch(`${base}/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ maSV: 'SV001', password: 'password' }),
  });
  assert.equal(studentLogin.status, 400);
  for (const secret of ['', 'short', 'replace-with-a-random-secret']) {
    const result = spawnSync(process.execPath, ['dist/main.js'], {
      cwd: fileURLToPath(new URL('../svc-auth', import.meta.url)),
      env: { ...process.env, JWT_SECRET: secret }, timeout: 10000, windowsHide: true, encoding: 'utf8',
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout + result.stderr, /JWT_SECRET phải/);
  }
  console.log('PASS: HTTP login bcrypt với DB giả; mật khẩu sai 401; DTO 400; expires_in và hạn JWT theo cấu hình; ba secret yếu chặn khởi động.');
} finally {
  await app.close();
}
