import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { verifyGoogleToken } from '../dist/auth/google-token.js';
import { AuthService } from '../dist/auth/auth.service.js';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'RS256', use: 'sig' };
const clientId = 'test-client.apps.googleusercontent.com';
const originalFetch = globalThis.fetch;

function token(changes = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'test-key' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ iss: 'https://accounts.google.com', aud: clientId,
    sub: 'google-user-1', iat: now, exp: now + 3600, ...changes })).toString('base64url');
  const content = `${header}.${body}`;
  return `${content}.${sign('RSA-SHA256', Buffer.from(content), privateKey).toString('base64url')}`;
}

test('Google token verification checks signature, audience, issuer and expiry', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ keys: [jwk] }), {
    headers: { 'cache-control': 'max-age=60' },
  });
  try {
    assert.equal(await verifyGoogleToken(token(), clientId), 'google-user-1');
    await assert.rejects(verifyGoogleToken(token({ aud: 'other-client' }), clientId), { status: 401 });
    await assert.rejects(verifyGoogleToken(token({ iss: 'https://example.com' }), clientId), { status: 401 });
    await assert.rejects(verifyGoogleToken(token({ exp: 0 }), clientId), { status: 401 });
    const valid = token();
    const altered = valid.slice(0, -2) + (valid.at(-2) === 'A' ? 'B' : 'A') + valid.at(-1);
    await assert.rejects(verifyGoogleToken(altered, clientId), { status: 401 });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Google login uses linked local user and preserves local role', async () => {
  const queries = [];
  const service = new AuthService({ query: async (sql, params) => {
    queries.push({ sql, params });
    return { recordset: [{ IdUser: 7, UserName: 'SV007', Role: 'student' }] };
  } }, { signAsync: async payload => {
    assert.deepEqual(payload, { sub: '7', username: 'SV007', role: 'student', maSV: 'SV007' });
    return 'local-jwt';
  } }, { getOrThrow: key => key === 'GOOGLE_CLIENT_ID' ? clientId : '15m', get: () => clientId });
  assert.deepEqual(await service.signInWithGoogle(token()), {
    access_token: 'local-jwt', expires_in: '15m', token_type: 'Bearer', username: 'SV007',
  });
  assert.equal(queries[0].params.subject, 'google-user-1');
});
