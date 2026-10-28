import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../dist/auth/auth.service.js';

test('creates a student account with the admin-supplied initial password', async () => {
  let account;
  const service = new AuthService({ query: async (sql, params) => {
    if (sql.startsWith('INSERT')) {
      assert.equal(params.username, 'SV001');
      assert.notEqual(params.password, 'SV001');
      assert.equal(await bcrypt.compare('StudentSecret123!', params.password), true);
      account = { IdUser: 1, UserName: params.username, Password: params.password, Role: 'student' };
      return { recordset: [account] };
    }
    return { recordset: account ? [account] : [] };
  } }, { signAsync: async payload => {
    assert.equal(payload.username, 'SV001');
    assert.equal(payload.role, 'student');
    assert.equal(payload.maSV, 'SV001');
    return 'signed-token';
  } },
  { getOrThrow: () => '15m' });
  assert.deepEqual(await service.createStudentAccount('SV001', 'StudentSecret123!'), { username: 'SV001', role: 'student' });
  await assert.rejects(service.signIn('SV001', 'SV001'), { status: 401 });
  assert.equal((await service.signIn('SV001', 'StudentSecret123!')).access_token, 'signed-token');
});

test('retry reuses an existing student account without resetting its password', async () => {
  const service = new AuthService({ query: async sql => {
    assert.ok(sql.startsWith('SELECT'));
    return { recordset: [{ IdUser: 1, UserName: 'SV001', Role: 'student' }] };
  } }, {}, {});
  assert.deepEqual(await service.createStudentAccount('SV001', 'StudentSecret123!'), { username: 'SV001', role: 'student' });
});

test('does not overwrite an account with another role', async () => {
  const service = new AuthService({ query: async () => ({ recordset: [{ UserName: 'demo', Role: 'admin' }] }) }, {}, {});
  await assert.rejects(service.createStudentAccount('demo', 'StudentSecret123!'), { status: 409 });
});

test('concurrent creation returns the account inserted by the other request', async () => {
  let reads = 0;
  const service = new AuthService({ query: async sql => {
    if (sql.startsWith('INSERT')) throw { number: 2627 };
    return { recordset: ++reads === 1 ? [] : [{ UserName: 'SV001', Role: 'student' }] };
  } }, {}, {});
  assert.deepEqual(await service.createStudentAccount('SV001', 'StudentSecret123!'), { username: 'SV001', role: 'student' });
});
