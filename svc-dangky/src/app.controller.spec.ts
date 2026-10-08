import { DatabaseService } from '@soa/database';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { SinhVienClient } from './clients/sinhvien.client.js';
import { DeTaiClient } from './clients/detai.client.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(() => {
    const database = {
      query: vi.fn().mockResolvedValue({ recordset: [{ result: 1 }] }),
    } as unknown as DatabaseService;
    appController = new AppController(
      new AppService(database, {} as SinhVienClient, {} as DeTaiClient),
    );
  });

  it('should return health payload', async () => {
    await expect(appController.getHealth()).resolves.toEqual({
      status: 'ok',
      service: 'dangky',
    });
  });
});
