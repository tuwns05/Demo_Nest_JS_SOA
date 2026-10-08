import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from '../features/auth/auth.service';
import { apiError } from './api';
import { authGuard } from './auth.guard';
import { authInterceptor } from './auth.interceptor';
import { SessionService } from './session.service';

function token(exp = Math.floor(Date.now() / 1000) + 3600): string {
  return 'header.' + btoa(JSON.stringify({ sub: '1', exp })) + '.signature';
}

describe('Authentication flow', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let session: SessionService;
  let auth: AuthService;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionService);
    auth = TestBed.inject(AuthService);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  afterEach(() => {
    backend.verify();
    session.end();
    sessionStorage.clear();
  });

  it('logs in without a bearer header and stores the session', () => {
    auth.login('demo', 'secret').subscribe();
    const req = backend.expectOne('/api/auth/login');
    expect(req.request.body).toEqual({ user: 'demo', password: 'secret' });
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ access_token: token(), expires_in: '1h', token_type: 'Bearer' });
    expect(session.authenticated()).toBe(true);
    expect(session.username()).toBe('demo');
    expect(sessionStorage.getItem('soa.session')).not.toBeNull();
  });

  it('attaches bearer only to this API', () => {
    const jwt = token();
    session.start(jwt, 'demo');
    http.get('/api/sinhvien').subscribe();
    const req = backend.expectOne('/api/sinhvien');
    expect(req.request.headers.get('Authorization')).toBe('Bearer ' + jwt);
    req.flush([]);
    http.get('https://example.com/data').subscribe();
    const external = backend.expectOne('https://example.com/data');
    expect(external.request.headers.has('Authorization')).toBe(false);
    external.flush({});
  });

  it('ends the session on a protected 401', () => {
    session.start(token(), 'demo');
    http.get('/api/sinhvien').subscribe({ error: () => {} });
    backend.expectOne('/api/sinhvien').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(session.authenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/dang-nhap'], { queryParams: { expired: '1' } });
  });

  it('does not expire another session on a failed login', () => {
    session.start(token(), 'demo');
    auth.login('other', 'bad').subscribe({ error: () => {} });
    backend.expectOne('/api/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(session.authenticated()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('redirects signed-out navigation while preserving the requested page', () => {
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/sinh-vien' } as RouterStateSnapshot),
    );
    expect(String(result)).toBe('/dang-nhap?returnUrl=%2Fsinh-vien');
    session.start(token(), 'demo');
    expect(
      TestBed.runInInjectionContext(() =>
        authGuard({} as ActivatedRouteSnapshot, { url: '/sinh-vien' } as RouterStateSnapshot),
      ),
    ).toBe(true);
  });

  it('rejects expired tokens', () => {
    expect(() => session.start(token(Math.floor(Date.now() / 1000) - 5), 'demo')).toThrow();
    expect(session.authenticated()).toBe(false);
  });

  it('extracts nested backend validation errors', () => {
    http.patch('/api/sinhvien/SV001', {}).subscribe({
      error: (error) => {
        expect(apiError(error)).toBe('email must be an email');
      },
    });
    backend.expectOne('/api/sinhvien/SV001').flush(
      {
        message: { message: ['email must be an email'], statusCode: 400 },
      },
      { status: 400, statusText: 'Bad Request' },
    );
  });
});
