import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { Controller, Get, Req, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '@soa/database';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { AppController } from '../src/app.controller.js';
import { AppService } from '../src/app.service.js';
import type { AuthenticatedRequest } from '../src/auth.guard.js';

const secret = 'test-only-secret-for-service-authentication';
const jwt = new JwtService({ secret });
const businessLogic = vi.fn();

// Controller chỉ có trong kiểm thử; APP_GUARD tự bảo vệ API mới.
@Controller('protected')
class ProtectedController {
  @Get()
  getProtected(@Req() req: AuthenticatedRequest) {
    businessLogic();
    return {
      user: req.user,
      forwardedUserId: req.headers['x-user-id'] ?? null,
    };
  }
}

describe('dangky authentication (HTTP)', () => {
  let app: INestApplication;
  const service = {
    getHealth: vi.fn().mockResolvedValue({ status: 'ok', service: 'dangky' }),
  };

  beforeAll(async () => {
    Reflect.defineMetadata('design:paramtypes', [AppService], AppController);
    const module = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ProtectedController],
    })
      .overrideProvider(ConfigService)
      .useValue({
        getOrThrow: (key: string) =>
          key === 'JWT_SECRET' ? secret : 'http://localhost:3001',
      })
      .overrideProvider(DatabaseService)
      .useValue({})
      .overrideProvider(AppService)
      .useValue(service)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('dangky');
    await app.init();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterAll(async () => {
    await app?.close();
  });

  it('allows health without authentication', async () => {
    await request(app.getHttpServer())
      .get('/dangky/health')
      .expect(200, { status: 'ok', service: 'dangky' });
  });

  it('keeps health failures at 503', async () => {
    service.getHealth.mockResolvedValueOnce({
      status: 'down',
      service: 'dangky',
    });
    await request(app.getHttpServer()).get('/dangky/health').expect(503);
  });

  it.each([
    ['missing', undefined],
    ['malformed', 'Basic abc'],
    ['invalid', 'Bearer invalid-token'],
    [
      'wrong signature',
      'Bearer ' +
        jwt.sign({ sub: '1' }, { secret: 'another-secret', expiresIn: '1h' }),
    ],
    ['expired', 'Bearer ' + jwt.sign({ sub: '1' }, { expiresIn: -10 })],
    ['missing subject', 'Bearer ' + jwt.sign({}, { expiresIn: '1h' })],
    ['blank subject', 'Bearer ' + jwt.sign({ sub: ' ' }, { expiresIn: '1h' })],
    ['missing expiry', 'Bearer ' + jwt.sign({ sub: '1' })],
    [
      'wrong algorithm',
      'Bearer ' +
        jwt.sign({ sub: '1' }, { algorithm: 'HS384', expiresIn: '1h' }),
    ],
  ])(
    'rejects %s credentials before business logic',
    async (_label, authorization) => {
      const call = request(app.getHttpServer())
        .get('/dangky/protected')
        .set('x-user-id', 'forged');
      if (authorization) call.set('Authorization', authorization);
      await call.expect(401);
      expect(businessLogic).not.toHaveBeenCalled();
    },
  );

  it('accepts direct access with a valid JWT and ignores forged user headers', async () => {
    const token = jwt.sign(
      { sub: '1', username: 'test-user' },
      { expiresIn: '15m' },
    );
    await request(app.getHttpServer())
      .get('/dangky/protected')
      .set('Authorization', 'Bearer ' + token)
      .set('x-user-id', 'forged')
      .expect(200, { user: { sub: '1' }, forwardedUserId: null });
    expect(businessLogic).toHaveBeenCalledOnce();
  });
});
