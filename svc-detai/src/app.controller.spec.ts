import { DatabaseService } from '@soa/database';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { RegistrationClient } from './registration.client.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(() => {
    const database = {
      query: vi.fn().mockResolvedValue({ recordset: [{ result: 1 }] }),
    } as unknown as DatabaseService;
    appController = new AppController(new AppService(database, {} as RegistrationClient));
  });

  it('should return health payload', async () => {
    await expect(appController.getHealth()).resolves.toEqual({
      status: 'ok',
      service: 'detai',
    });
  });
});
