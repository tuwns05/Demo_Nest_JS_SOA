import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { SinhVienClient } from '../svc-dangky/dist/clients/sinhvien.client.js';
import { DeTaiClient } from '../svc-dangky/dist/clients/detai.client.js';

const require = createRequire(new URL('../svc-dangky/package.json', import.meta.url));
const { HttpService } = require('@nestjs/axios');
const { ConfigService } = require('@nestjs/config');
let status = 200;
let hang = false;
const server = createServer((req, res) => {
  if (hang) return;
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ path: req.url }));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}`;
const http = new HttpService();
const config = new ConfigService({ SERVICE_URL_SINHVIEN: url, SERVICE_URL_DETAI: url });
const clients = [new SinhVienClient(http, config), new DeTaiClient(http, config)];
const close = () => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); });
try {
  for (const [index, client] of clients.entries()) {
    assert.deepEqual(await client.findById('a/b'), { path: `/${index === 0 ? 'sinhvien' : 'detai'}/a%2Fb` });
  }
  status = 404;
  for (const client of clients) await assert.rejects(client.findById(9), error => error.getStatus() === 404 && error.message.includes('9'));
  status = 500;
  for (const client of clients) await assert.rejects(client.findById(9), error => error.getStatus() === 500);
  hang = true;
  const start = Date.now();
  await Promise.all(clients.map(client => assert.rejects(client.findById(9), error => error.getStatus() === 503)));
  assert.ok(Date.now() - start >= 4900 && Date.now() - start < 7000);
  await close();
  for (const client of clients) await assert.rejects(client.findById(9), error => error.getStatus() === 503);
  console.log('PASS: hai client giữ URL/encode ID; dữ liệu 200; lỗi 404; HTTP 500; timeout 5s và kết nối hỏng 503.');
} finally { await close(); }
