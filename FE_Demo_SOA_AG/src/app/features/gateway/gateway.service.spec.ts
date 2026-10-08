import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GatewayService } from './gateway.service';
import { DeTaiService } from '../de-tai/de-tai.service';
import { DangKyService } from '../dang-ky/dang-ky.service';

describe('Health services', () => {
  let backend: HttpTestingController;
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
  });
  afterEach(() => backend.verify());

  it('displays a degraded gateway response returned with 503', () => {
    const store = TestBed.inject(GatewayService);
    TestBed.tick();
    store.check();
    const health = {
      status: 'degraded',
      gateway: 'up',
      services: { auth: 'up', sinhvien: 'up', detai: 'down', dangky: 'up' },
      timestamp: new Date().toISOString(),
    };
    backend
      .expectOne('/api/health')
      .flush(health, { status: 503, statusText: 'Service Unavailable' });
    expect(store.health()?.services.detai).toBe('down');
    expect(store.error()).toBe('');
    expect(store.loading()).toBe(false);
  });

  it('keeps topic and registration health state separate', () => {
    const topic = TestBed.inject(DeTaiService);
    const registration = TestBed.inject(DangKyService);
    TestBed.tick();
    topic.check();
    registration.check();
    backend.expectOne('/api/detai/health').flush({ status: 'ok', service: 'detai' });
    backend
      .expectOne('/api/dangky/health')
      .flush(
        { status: 'down', service: 'dangky' },
        { status: 503, statusText: 'Service Unavailable' },
      );
    expect(topic.health()?.status).toBe('ok');
    expect(registration.health()?.status).toBe('down');
  });

  it('understands the nested health error from the backend exception filter', () => {
    const store = TestBed.inject(DeTaiService);
    TestBed.tick();
    store.check();
    backend.expectOne('/api/detai/health').flush(
      {
        statusCode: 503,
        message: { status: 'down', service: 'detai' },
      },
      { status: 503, statusText: 'Service Unavailable' },
    );
    expect(store.health()?.status).toBe('down');
    expect(store.error()).toBe('');
  });
});
