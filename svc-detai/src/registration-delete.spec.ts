import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '@soa/database';
import { AppService } from './app.service.js';
import { RegistrationClient } from './registration.client.js';

describe('Delete topic registration protection', () => {
  const query = vi.fn();
  const hasTopicRegistrations = vi.fn();
  const service = new AppService(
    { query } as unknown as DatabaseService,
    { hasTopicRegistrations } as unknown as RegistrationClient,
  );

  beforeEach(() => vi.resetAllMocks());

  it('blocks deletion when a registration exists', async () => {
    hasTopicRegistrations.mockResolvedValue(true);
    await expect(service.remove(2, 'Bearer admin')).rejects.toBeInstanceOf(ConflictException);
    expect(hasTopicRegistrations).toHaveBeenCalledWith(2, 'Bearer admin');
    expect(query).not.toHaveBeenCalled();
  });

  it('deletes only after the registration check succeeds', async () => {
    hasTopicRegistrations.mockResolvedValue(false);
    query.mockResolvedValue({ recordset: [{ MaDT: 2 }] });
    await expect(service.remove(2, 'Bearer admin')).resolves.toMatchObject({ data: { MaDT: 2 } });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM dbo.DETAI'), { maDT: 2 });
  });

  it('does not delete if registration service is unavailable', async () => {
    hasTopicRegistrations.mockRejectedValue(new ServiceUnavailableException());
    await expect(service.remove(2, 'Bearer admin')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(query).not.toHaveBeenCalled();
  });
});
