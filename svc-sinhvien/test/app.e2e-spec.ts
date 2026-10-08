import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '@soa/database';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { AppController } from '../src/app.controller.js';
import { AppService } from '../src/app.service.js';
import { CreateSinhVienDto } from '../src/dto/create-sinhvien.dto.js';
import { UpdateSinhVienDto } from '../src/dto/update-sinhvien.dto.js';

const secret = 'test-only-secret-for-sinhvien-authentication';
const jwt = new JwtService({ secret });
const createPath = '/sinhvien/sinh-vien/create';

describe('Sinhvien authentication (HTTP)', () => {
  let app: INestApplication;
  const service = {
    getHealth: vi.fn().mockResolvedValue({ status: 'ok', service: 'sinhvien' }),
    create: vi.fn().mockResolvedValue({ message: 'created' }),
    findAll: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue({ MaSV: 'SV001' }),
    update: vi.fn().mockResolvedValue({ message: 'updated' }),
    remove: vi.fn().mockResolvedValue({ message: 'deleted' }),
  };

  beforeAll(async () => {
    // Vite does not emit TypeScript constructor metadata.
    Reflect.defineMetadata('design:paramtypes', [AppService], AppController);
    Reflect.defineMetadata(
      'design:paramtypes',
      [CreateSinhVienDto],
      AppController.prototype,
      'create',
    );
    Reflect.defineMetadata(
      'design:paramtypes',
      [String, UpdateSinhVienDto],
      AppController.prototype,
      'update',
    );
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ConfigService)
      .useValue({ getOrThrow: () => secret })
      .overrideProvider(DatabaseService)
      .useValue({})
      .overrideProvider(AppService)
      .useValue(service)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('sinhvien');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  beforeEach(() => vi.clearAllMocks());
  afterAll(async () => {
    await app?.close();
  });

  it('allows health checks without a token', async () => {
    await request(app.getHttpServer())
      .get('/sinhvien/sinh-vien/health')
      .expect(200)
      .expect({ status: 'ok', service: 'sinhvien' });
  });

  it.each([
    ['missing', undefined],
    ['malformed', 'Basic abc'],
    ['invalid', 'Bearer invalid-token'],
    [
      'wrong signature',
      `Bearer ${jwt.sign({ sub: '1' }, { secret: 'another-secret', expiresIn: '1h' })}`,
    ],
    ['expired', `Bearer ${jwt.sign({ sub: '1' }, { expiresIn: -10 })}`],
    ['missing subject', `Bearer ${jwt.sign({}, { expiresIn: '1h' })}`],
    ['blank subject', `Bearer ${jwt.sign({ sub: ' ' }, { expiresIn: '1h' })}`],
    ['missing expiry', `Bearer ${jwt.sign({ sub: '1' })}`],
    [
      'wrong algorithm',
      `Bearer ${jwt.sign({ sub: '1' }, { algorithm: 'HS384', expiresIn: '1h' })}`,
    ],
  ])(
    'rejects %s credentials before executing business logic',
    async (_name, authorization) => {
      const call = request(app.getHttpServer())
        .post(createPath)
        .set('x-user-id', 'forged-user');
      if (authorization) call.set('Authorization', authorization);
      await call.send({}).expect(401);
      expect(service.create).not.toHaveBeenCalled();
    },
  );

  it('accepts a valid auth-service JWT when called directly', async () => {
    const token = jwt.sign(
      { sub: '1', username: 'test-user' },
      { expiresIn: '15m' },
    );
    await request(app.getHttpServer())
      .post(createPath)
      .set('Authorization', `Bearer ${token}`)
      .send({
        maSV: 'SV001',
        hoTen: 'Nguyễn Văn A',
        email: 'a@example.com',
        lop: 'CNTT01',
        matKhau: '123456',
      })
      .expect(201);
    expect(service.create).toHaveBeenCalledOnce();
  });

  it('exposes the canonical CRUD routes with JWT protection', async () => {
    const token = jwt.sign({ sub: '1' }, { expiresIn: '15m' });
    const authorization = `Bearer ${token}`;
    await request(app.getHttpServer()).get('/sinhvien/health').expect(200);
    await request(app.getHttpServer())
      .post('/sinhvien')
      .set('Authorization', authorization)
      .send({
        maSV: 'SV001',
        hoTen: 'Nguyễn Văn A',
        email: 'a@example.com',
        lop: 'CNTT01',
        matKhau: '123456',
      })
      .expect(201);
    await request(app.getHttpServer())
      .get('/sinhvien')
      .set('Authorization', authorization)
      .expect(200, []);
    await request(app.getHttpServer())
      .get('/sinhvien/SV001')
      .set('Authorization', authorization)
      .expect(200, { MaSV: 'SV001' });
    await request(app.getHttpServer())
      .patch('/sinhvien/SV001')
      .set('Authorization', authorization)
      .send({ lop: 'CNTT02' })
      .expect(200);
    expect(service.update).toHaveBeenCalledWith(
      'SV001',
      expect.objectContaining({ lop: 'CNTT02' }),
    );
    await request(app.getHttpServer())
      .delete('/sinhvien/SV001')
      .set('Authorization', authorization)
      .expect(200);
    expect(service.remove).toHaveBeenCalledWith('SV001');
  });

  it.each([
    { hoTen: '' },
    { lop: null },
    { email: 'invalid' },
    { matKhau: '123' },
    { maSV: 'NEW' },
  ])('rejects invalid updates: %j', async (body) => {
    const token = jwt.sign({ sub: '1' }, { expiresIn: '15m' });
    await request(app.getHttpServer())
      .patch('/sinhvien/SV001')
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(400);
    expect(service.update).not.toHaveBeenCalled();
  });

  it.each(['get', 'patch', 'delete'] as const)(
    'protects %s operations without JWT',
    async (method) => {
      await request(app.getHttpServer())[method]('/sinhvien/SV001').expect(401);
      expect(service.findOne).not.toHaveBeenCalled();
      expect(service.update).not.toHaveBeenCalled();
      expect(service.remove).not.toHaveBeenCalled();
    },
  );
});
