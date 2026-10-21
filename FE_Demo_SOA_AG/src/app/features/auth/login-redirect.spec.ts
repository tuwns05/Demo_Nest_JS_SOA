import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AuthComponent } from './auth.component';
import { SessionService } from '../../core/session.service';

describe('Login role redirect', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [AuthComponent],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ returnUrl: '/sinh-vien' }) } } },
      ],
    });
  });
  afterEach(() => { TestBed.inject(SessionService).end(); sessionStorage.clear(); });
  it.each([['student', '/sinh-vien-ca-nhan'], ['admin', '/sinh-vien']])('redirects %s after login', (role, expected) => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const component = TestBed.createComponent(AuthComponent).componentInstance;
    component.user = 'SV001';
    component.password = 'SV001';
    component.login();
    const jwt = 'header.' + btoa(JSON.stringify({ sub: '1', role, maSV: 'SV001', exp: Math.floor(Date.now() / 1000) + 3600 })) + '.signature';
    TestBed.inject(HttpTestingController).expectOne('/api/auth/login').flush({ access_token: jwt });
    expect(navigate).toHaveBeenCalledWith(expected);
    TestBed.inject(HttpTestingController).verify();
  });
});
