import { DatabaseService } from '@soa/database';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(() => {
    const database = {
      query: vi.fn().mockResolvedValue({ recordset: [{ result: 1 }] }),
    } as unknown as DatabaseService;
    appController = new AppController(new AppService(database));
  });

  it('should return health payload', async () => {
    await expect(appController.getHealth()).resolves.toEqual({
      status: 'ok',
      service: 'detai',
    });
  });
});
