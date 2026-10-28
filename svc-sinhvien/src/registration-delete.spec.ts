import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '@soa/database';
import { AppService } from './app.service.js';
import { AuthClient } from './auth.client.js';
import { RegistrationClient } from './registration.client.js';

describe('Delete student registration protection', () => {
  const query = vi.fn();
  const hasStudentRegistrations = vi.fn();
  const service = new AppService(
    { query } as unknown as DatabaseService,
    {} as AuthClient,
    { hasStudentRegistrations } as unknown as RegistrationClient,
  );

  beforeEach(() => vi.resetAllMocks());

  it('blocks deletion when a registration exists', async () => {
    hasStudentRegistrations.mockResolvedValue(true);
    await expect(service.remove('SV001', 'Bearer admin')).rejects.toBeInstanceOf(ConflictException);
    expect(hasStudentRegistrations).toHaveBeenCalledWith('SV001', 'Bearer admin');
    expect(query).not.toHaveBeenCalled();
  });

  it('deletes only after the registration check succeeds', async () => {
    hasStudentRegistrations.mockResolvedValue(false);
    query.mockResolvedValue({ recordset: [{ MaSV: 'SV001' }] });
    await expect(service.remove('SV001', 'Bearer admin')).resolves.toMatchObject({ data: { MaSV: 'SV001' } });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM SINHVIEN'), { maSV: 'SV001' });
  });

  it('does not delete if registration service is unavailable', async () => {
    hasStudentRegistrations.mockRejectedValue(new ServiceUnavailableException());
    await expect(service.remove('SV001', 'Bearer admin')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(query).not.toHaveBeenCalled();
  });
});
