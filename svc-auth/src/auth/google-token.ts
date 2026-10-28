import { createPublicKey, verify, type JsonWebKey } from 'node:crypto';
import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';

interface GoogleKey extends JsonWebKey {
  kid?: string;
  kty?: string;
  alg?: string;
  use?: string;
}

let keys: GoogleKey[] = [];
let keysExpireAt = 0;

async function getKeys(): Promise<GoogleKey[]> {
  if (Date.now() < keysExpireAt && keys.length) return keys;
  let response: Response;
  try {
    response = await fetch('https://www.googleapis.com/oauth2/v3/certs', {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error('Google keys unavailable');
    const body = await response.json() as { keys?: GoogleKey[] };
    if (!Array.isArray(body.keys) || !body.keys.length) throw new Error('Google keys missing');
    const maxAge = Number(/max-age=(\d+)/i.exec(response.headers.get('cache-control') ?? '')?.[1] ?? 300);
    keys = body.keys;
    keysExpireAt = Date.now() + Math.min(Math.max(maxAge, 60), 3600) * 1000;
    return keys;
  } catch {
    throw new ServiceUnavailableException('Không xác minh được Google lúc này. Vui lòng thử lại.');
  }
}

export async function verifyGoogleToken(token: string, clientId: string): Promise<string> {
  const invalid = () => new UnauthorizedException('Thông tin đăng nhập Google không hợp lệ');
  if (token.length > 8192) throw invalid();
  const parts = token.split('.');
  if (parts.length !== 3) throw invalid();
  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as { alg?: string; kid?: string };
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
      iss?: string; aud?: string; sub?: string; exp?: number; iat?: number; nbf?: number;
    };
    const now = Math.floor(Date.now() / 1000);
    if (header.alg !== 'RS256' || !header.kid ||
        !['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss ?? '') ||
        payload.aud !== clientId || typeof payload.sub !== 'string' || !payload.sub ||
        payload.sub.length > 255 || typeof payload.exp !== 'number' || payload.exp <= now ||
        typeof payload.iat !== 'number' || payload.iat > now + 60 ||
        (payload.nbf !== undefined && (typeof payload.nbf !== 'number' || payload.nbf > now + 60))) {
      throw invalid();
    }
    const key = (await getKeys()).find(item => item.kid === header.kid && item.kty === 'RSA' && item.use === 'sig' && item.alg === 'RS256');
    if (!key || !verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`),
      createPublicKey({ key, format: 'jwk' }), Buffer.from(parts[2], 'base64url'))) throw invalid();
    return payload.sub;
  } catch (error) {
    if (error instanceof ServiceUnavailableException || error instanceof UnauthorizedException) throw error;
    throw invalid();
  }
}
