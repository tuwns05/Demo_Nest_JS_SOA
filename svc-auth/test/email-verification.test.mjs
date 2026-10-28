import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AuthService } from '../dist/auth/auth.service.js';

test('admin registration needs the mailed code; a code is single-use and grants admin only after verification', async () => {
  const sent = [];
  const users = [];
  let verification;
  const database = { query: async (sql, p) => {
    if (sql.includes('SELECT IdUser FROM dbo.[User]')) return { recordset: users.filter(u => u.UserName === p.email) };
    if (sql.includes('SELECT LastSentAt FROM dbo.EmailVerification')) {
      return { recordset: verification ? [{ LastSentAt: verification.lastSentAt }] : [] };
    }
    if (sql.includes('INSERT INTO dbo.EmailVerification')) {
      verification = { hash: p.hash, attempts: 0, consumed: false, lastSentAt: new Date() };
      return { recordset: [] };
    }
    if (sql.includes('UPDATE dbo.EmailVerification') && sql.includes('OUTPUT INSERTED.ConsumedAt')) {
      if (!verification || verification.consumed || verification.attempts >= 5) return { recordset: [] };
      verification.attempts++;
      if (p.hash === verification.hash) verification.consumed = true;
      return { recordset: [{ ConsumedAt: verification.consumed ? new Date() : null }] };
    }
    if (sql.includes('INSERT INTO dbo.[User]')) {
      users.push({ UserName: p.email, Password: p.password, Role: 'admin' });
      return { recordset: [] };
    }
    throw new Error(`Unexpected query: ${sql}`);
  } };
  const service = new AuthService(database, {}, {
    getOrThrow: key => key === 'JWT_SECRET' ? 'test-secret' : '15m',
  }, { sendCode: async (email, code) => sent.push({ email, code }) });

  await service.requestAdminRegistration(' Admin@Example.com ');
  assert.equal(sent[0].email, 'admin@example.com');
  assert.match(sent[0].code, /^\d{6}$/);
  assert.equal(users.length, 0);
  await assert.rejects(service.completeAdminRegistration('admin@example.com', '999999' === sent[0].code ? '888888' : '999999', 'secret123'), { status: 401 });
  assert.equal(users.length, 0);
  await service.completeAdminRegistration('admin@example.com', sent[0].code, 'secret123');
  assert.equal(users[0].Role, 'admin');
  assert.notEqual(users[0].Password, 'secret123');
  await assert.rejects(service.completeAdminRegistration('admin@example.com', sent[0].code, 'secret123'), { status: 401 });
});
