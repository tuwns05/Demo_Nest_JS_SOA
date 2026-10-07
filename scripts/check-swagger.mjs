import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

for (const name of ['auth', 'sinhvien', 'detai', 'dangky']) {
  const reservation = createServer();
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const child = spawn(process.execPath, ['--import', new URL('./fixtures/database-stub.mjs', import.meta.url).href, 'dist/main.js'], {
    cwd: fileURLToPath(new URL(`../svc-${name}`, import.meta.url)), windowsHide: true,
    env: { ...process.env, PORT: String(port), JWT_SECRET: randomBytes(32).toString('hex'), JWT_EXPIRES_IN: '15m',
      SERVICE_URL_SINHVIEN: 'http://127.0.0.1:1', SERVICE_URL_DETAI: 'http://127.0.0.1:1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', chunk => { logs += chunk; });
  child.stderr.on('data', chunk => { logs += chunk; });
  try {
    const base = `http://127.0.0.1:${port}`;
    for (let attempt = 0; ; attempt++) {
      try { await fetch(`${base}/api`); break; } catch {
        if (attempt > 100 || child.exitCode !== null) throw new Error(logs);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    assert.equal((await fetch(`${base}/api`)).status, 200);
    const spec = await (await fetch(`${base}/api-json`)).json();
    assert.ok(spec.paths[`/${name}/health`]);
    if (name === 'auth') assert.ok(spec.components.securitySchemes.bearer);
    else {
      assert.ok(spec.paths[`/${name}/health`].get.tags.length);
      assert.ok(/[à-ỹ]/u.test(spec.info.description));
    }
    assert.equal((await fetch(`${base}/${name}/health`)).status, 200);
    console.log(`PASS: svc-${name} start:prod, /api, /api-json và health với DB giả.`);
  } finally {
    if (child.exitCode === null) {
      const exited = new Promise(resolve => child.once('exit', resolve));
      child.kill();
      await exited;
    }
  }
}
