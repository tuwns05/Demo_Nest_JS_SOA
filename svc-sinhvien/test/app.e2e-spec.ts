import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '@soa/database';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { AppController } from '../src/app.controller.js';
import { AppService } from '../src/app.service.js';

const secret = 'test-only-secret-for-sinhvien-authentication';
const jwt = new JwtService({ secret });
const createPath = '/sinhvien/sinh-vien/create';

describe('Sinhvien authentication (HTTP)', () => {
  let app: INestApplication;
  const service = {
    getHealth: vi.fn().mockResolvedValue({ status: 'ok', service: 'sinhvien' }),
    create: vi.fn().mockResolvedValue({ message: 'created' }),
  };

  beforeAll(async () => {
    // Vite does not emit TypeScript constructor metadata.
    Reflect.defineMetadata('design:paramtypes', [AppService, AppService], AppController);
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService).useValue({ getOrThrow: () => secret })
      .overrideProvider(DatabaseService).useValue({})
      .overrideProvider(AppService).useValue(service)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('sinhvien');
    await app.init();
  });

  beforeEach(() => vi.clearAllMocks());
  afterAll(async () => { await app?.close(); });

  it('allows health checks without a token', async () => {
    await request(app.getHttpServer()).get('/sinhvien/sinh-vien/health')
      .expect(200).expect({ status: 'ok', service: 'sinhvien' });
  });

  it.each([
    ['missing', undefined],
    ['malformed', 'Basic abc'],
    ['invalid', 'Bearer invalid-token'],
    ['wrong signature', `Bearer ${jwt.sign({ sub: '1' }, { secret: 'another-secret', expiresIn: '1h' })}`],
    ['expired', `Bearer ${jwt.sign({ sub: '1' }, { expiresIn: -10 })}`],
    ['missing subject', `Bearer ${jwt.sign({}, { expiresIn: '1h' })}`],
    ['blank subject', `Bearer ${jwt.sign({ sub: ' ' }, { expiresIn: '1h' })}`],
    ['missing expiry', `Bearer ${jwt.sign({ sub: '1' })}`],
    ['wrong algorithm', `Bearer ${jwt.sign({ sub: '1' }, { algorithm: 'HS384', expiresIn: '1h' })}`],
  ])('rejects %s credentials before executing business logic', async (_name, authorization) => {
    const call = request(app.getHttpServer()).post(createPath).set('x-user-id', 'forged-user');
    if (authorization) call.set('Authorization', authorization);
    await call.send({}).expect(401);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('accepts a valid auth-service JWT when called directly', async () => {
    const token = jwt.sign({ sub: '1', username: 'test-user' }, { expiresIn: '15m' });
    await request(app.getHttpServer()).post(createPath)
      .set('Authorization', `Bearer ${token}`).send({}).expect(201);
    expect(service.create).toHaveBeenCalledOnce();
  });
});
