import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { RegistrationClient } from './registration.client.js';

describe('Student registration client', () => {
  const fetchMock = vi.fn();
  afterEach(() => vi.unstubAllGlobals());
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('uses the local registration service when the optional URL is absent', async () => {
    const client = new RegistrationClient(new ConfigService({}));
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ exists: true })));
    await expect(client.hasStudentRegistrations('SV001', 'Bearer admin')).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3003/dangky/exists/student/SV001',
      expect.objectContaining({ headers: { Authorization: 'Bearer admin' } }));
  });

  it('uses the configured URL and escapes the student ID', async () => {
    const client = new RegistrationClient(new ConfigService({ SERVICE_URL_DANGKY: 'http://registrations:3003/' }));
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ exists: false })));
    await expect(client.hasStudentRegistrations('SV/01', 'Bearer admin')).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledWith('http://registrations:3003/dangky/exists/student/SV%2F01', expect.anything());
  });

  it('preserves service failures instead of treating them as no registrations', async () => {
    const client = new RegistrationClient(new ConfigService({}));
    fetchMock.mockRejectedValue(new Error('connection refused'));
    await expect(client.hasStudentRegistrations('SV001', 'Bearer admin')).rejects.toBeInstanceOf(ServiceUnavailableException);
    fetchMock.mockResolvedValue(new Response('{}', { status: 403 }));
    await expect(client.hasStudentRegistrations('SV001', 'Bearer admin')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
