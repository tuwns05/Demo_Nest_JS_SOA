import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../gateway/package.json', import.meta.url));
const { JwtService } = require('@nestjs/jwt');
const servers = [];
const received = [];
let hangHealth = false;
let child;
let logs = '';
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const close = server => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); });
try {
  const env = { ...process.env, JWT_SECRET: randomBytes(32).toString('hex') };
  for (const name of ['auth', 'sinhvien', 'detai', 'dangky']) {
    const server = createServer((req, res) => {
      received.push({ name, path: req.url, headers: req.headers });
      if (hangHealth && req.url.endsWith('/health')) return;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ name, path: req.url, headers: req.headers, status: 'ok' }));
    });
    servers.push(server);
    await listen(server);
    env[`SERVICE_URL_${name.toUpperCase()}`] = `http://127.0.0.1:${server.address().port}`;
  }
  const reservation = createServer();
  await listen(reservation);
  env.PORT = String(reservation.address().port);
  await close(reservation);
  child = spawn(process.execPath, ['dist/main.js'], {
    cwd: fileURLToPath(new URL('../gateway', import.meta.url)), env, windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', chunk => { logs += chunk; });
  child.stderr.on('data', chunk => { logs += chunk; });
  const base = `http://127.0.0.1:${env.PORT}`;
  for (let attempt = 0; ; attempt++) {
    try { await fetch(`${base}/health`); break; } catch {
      if (attempt > 80 || child.exitCode !== null) throw new Error(`Gateway không khởi động: ${logs}`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  const jwt = new JwtService({ secret: env.JWT_SECRET });
  const token = await jwt.signAsync({ sub: '42' }, { expiresIn: '5m' });
  const auth = { authorization: `Bearer ${token}` };
  received.length = 0;
  assert.equal((await fetch(`${base}/sinhvien/5`)).status, 401);
  assert.equal((await fetch(`${base}/sinhvien/5`, { headers: { authorization: 'Bearer junk' } })).status, 401);
  assert.equal(received.length, 0, 'Request 401 không được đến upstream');
  const response = await fetch(`${base}/sinhvien/5`, {
    headers: { ...auth, 'x-user-id': '999', 'x-untrusted': 'remove-me' },
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.headers['x-user-id'], '42');
  assert.equal(data.headers['x-untrusted'], undefined);
  const query = await fetch(`${base}/sinhvien?page=1&name=a%20b`, { headers: auth });
  assert.equal(query.status, 200);
  assert.equal((await query.json()).path, '/sinhvien?page=1&name=a%20b');
  assert.equal((await fetch(`${base}/auth/login`, { method: 'POST' })).status, 200);
  assert.equal(received.at(-1).headers['x-user-id'], undefined);
  assert.equal((await fetch(`${base}/auth/health`)).status, 401);
  assert.equal((await fetch(`${base}/unknown`, { headers: auth })).status, 404);
  const health = await fetch(`${base}/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, 'ok');
  await close(servers[2]);
  const degraded = await fetch(`${base}/health`);
  assert.equal(degraded.status, 503);
  const degradedData = await degraded.json();
  assert.equal(degradedData.status, 'degraded');
  assert.equal(degradedData.services.detai, 'down');
  assert.equal((await fetch(`${base}/detai/5`, { headers: auth })).status, 503);
  assert.equal((await fetch(`${base}/sinhvien/5`, { headers: auth })).status, 200);
  hangHealth = true;
  const start = Date.now();
  assert.equal((await fetch(`${base}/health`)).status, 503);
  assert.ok(Date.now() - start < 3500, 'Health phải timeout song song');
  console.log('PASS: 401 không gọi upstream; token 200; header; query; public routes; 404; health 200/503; route 503; cô lập lỗi; timeout song song.');
} finally {
  if (child && child.exitCode === null) {
    const exited = new Promise(resolve => child.once('exit', resolve));
    child.kill();
    await exited;
  }
  await Promise.all(servers.map(close));
}
