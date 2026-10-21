import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Module, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, NestFactory } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AuthController } from '../dist/auth/auth.controller.js';
import { AuthGuard } from '../dist/auth/auth.guard.js';
import { AuthService } from '../dist/auth/auth.service.js';

test('account creation requires admin role even when calling Auth directly', async () => {
  const secret = 'test-only-secret-for-auth-role-authorization';
  const jwt = new JwtService({ secret });
  let calls = 0;
  class TestModule {}
  Module({
    imports: [JwtModule.register({ secret })], controllers: [AuthController],
    providers: [
      { provide: AuthService, useValue: { createStudentAccount: async maSV => { calls++; return { username: maSV, role: 'student' }; } } },
      { provide: APP_GUARD, useClass: AuthGuard },
    ],
  })(TestModule);
  const app = await NestFactory.create(TestModule, { logger: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  await app.listen(0, '127.0.0.1');
  try {
    const base = await app.getUrl();
    const create = async (claims, body = { maSV: 'SV001' }) => fetch(base + '/auth/accounts/student', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jwt.sign(claims, { expiresIn: '15m' }) },
      body: JSON.stringify(body),
    });
    assert.equal((await create({ sub: '2', role: 'student', maSV: 'SV001' })).status, 403);
    assert.equal((await create({ sub: '2' })).status, 401);
    assert.equal(calls, 0);
    assert.equal((await create({ sub: '1', role: 'admin' }, { maSV: 'SV001', role: 'admin' })).status, 400);
    const response = await create({ sub: '1', role: 'admin' });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { username: 'SV001', role: 'student' });
    assert.equal(calls, 1);
  } finally { await app.close(); }
});
