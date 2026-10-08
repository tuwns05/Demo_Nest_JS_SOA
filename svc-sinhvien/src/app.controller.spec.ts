import { ServiceUnavailableException } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController health', () => {
  it('returns the database health result', async () => {
    const health = { status: 'ok', service: 'sinhvien' };
    const service = { getHealth: vi.fn().mockResolvedValue(health) } as unknown as AppService;
    await expect(new AppController(service, service).getHealth()).resolves.toEqual(health);
  });

  it('returns 503 when the database is unavailable', async () => {
    const service = {
      getHealth: vi.fn().mockResolvedValue({ status: 'down', service: 'sinhvien' }),
    } as unknown as AppService;
    await expect(new AppController(service, service).getHealth()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
