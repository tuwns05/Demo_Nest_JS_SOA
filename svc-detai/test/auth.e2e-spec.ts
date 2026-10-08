import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { CreateDeTaiDto, UpdateDeTaiDto } from '../src/dto/detai.dto.js';
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

describe('detai authentication (HTTP)', () => {
  let app: INestApplication;
  const service = {
    findAll: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue({ MaDT: 1 }),
    create: vi.fn().mockResolvedValue({ message: 'created' }),
    update: vi.fn().mockResolvedValue({ message: 'updated' }),
    remove: vi.fn().mockResolvedValue({ message: 'deleted' }),
    getHealth: vi.fn().mockResolvedValue({ status: 'ok', service: 'detai' }),
  };

  beforeAll(async () => {
    Reflect.defineMetadata('design:paramtypes', [AppService], AppController);
    Reflect.defineMetadata(
      'design:paramtypes',
      [CreateDeTaiDto, String],
      AppController.prototype,
      'create',
    );
    Reflect.defineMetadata(
      'design:paramtypes',
      [Number, UpdateDeTaiDto, String],
      AppController.prototype,
      'update',
    );
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
    app.setGlobalPrefix('detai');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(['get', 'post', 'patch', 'delete'] as const)(
    'protects the %s CRUD endpoint',
    async (method) => {
      const path = ['patch', 'delete'].includes(method) ? '/detai/1' : '/detai';
      await request(app.getHttpServer())
        [method](path)
        .send({ tenDT: 'Đề tài thử' })
        .expect(401);
      expect(service.findAll).not.toHaveBeenCalled();
      expect(service.create).not.toHaveBeenCalled();
      expect(service.update).not.toHaveBeenCalled();
      expect(service.remove).not.toHaveBeenCalled();
    },
  );

  it('protects detail access', async () => {
    await request(app.getHttpServer()).get('/detai/1').expect(401);
    expect(service.findOne).not.toHaveBeenCalled();
  });

  it('routes every CRUD operation with a valid JWT', async () => {
    const authorization =
      'Bearer ' + jwt.sign({ sub: '1' }, { expiresIn: '15m' });
    await request(app.getHttpServer())
      .get('/detai')
      .set('Authorization', authorization)
      .expect(200, []);
    await request(app.getHttpServer())
      .get('/detai/1')
      .set('Authorization', authorization)
      .expect(200);
    await request(app.getHttpServer())
      .post('/detai')
      .set('Authorization', authorization)
      .send({ tenDT: 'Đề tài thử' })
      .expect(201);
    await request(app.getHttpServer())
      .patch('/detai/1')
      .set('Authorization', authorization)
      .send({ tenDT: 'Đề tài thử' })
      .expect(200);
    await request(app.getHttpServer())
      .delete('/detai/1')
      .set('Authorization', authorization)
      .expect(200);
    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({ tenDT: 'Đề tài thử' }),
    );
    expect(service.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ tenDT: 'Đề tài thử' }),
    );
  });

  it('rejects invalid bodies and IDs before the service', async () => {
    const authorization =
      'Bearer ' + jwt.sign({ sub: '1' }, { expiresIn: '15m' });
    for (const body of [
      {},
      { tenDT: 'Đề tài thử', unexpected: true },
      { tenDT: null },
    ]) {
      await request(app.getHttpServer())
        .post('/detai')
        .set('Authorization', authorization)
        .send(body)
        .expect(400);
    }
    await request(app.getHttpServer())
      .patch('/detai/1')
      .set('Authorization', authorization)
      .send({ tenDT: null })
      .expect(400);
    await request(app.getHttpServer())
      .get('/detai/abc')
      .set('Authorization', authorization)
      .expect(400);
    expect(service.create).not.toHaveBeenCalled();
    expect(service.update).not.toHaveBeenCalled();
    expect(service.findOne).not.toHaveBeenCalled();
  });
  afterAll(async () => {
    await app?.close();
  });

  it('allows health without authentication', async () => {
    await request(app.getHttpServer())
      .get('/detai/health')
      .expect(200, { status: 'ok', service: 'detai' });
  });

  it('keeps health failures at 503', async () => {
    service.getHealth.mockResolvedValueOnce({
      status: 'down',
      service: 'detai',
    });
    await request(app.getHttpServer()).get('/detai/health').expect(503);
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
        .get('/detai/protected')
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
      .get('/detai/protected')
      .set('Authorization', 'Bearer ' + token)
      .set('x-user-id', 'forged')
      .expect(200, { user: { sub: '1' }, forwardedUserId: null });
    expect(businessLogic).toHaveBeenCalledOnce();
  });
});
