import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StudentComponent } from './student.component';

describe('Student portal', () => {
  let backend: HttpTestingController;
  const student = { MaSV: 'SV001', HoTen: 'Nguyễn Văn An', Email: 'an@example.com', Lop: 'CNTT01' };
  const topic = { MaDT: 1, TenDT: 'Ứng dụng SOA', MoTa: 'Quản lý đồ án', GiangVienHD: 'Thầy A' };
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StudentComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
  });
  afterEach(() => backend.verify());

  it('shows the profile and registers using only the selected topic', () => {
    const fixture = TestBed.createComponent(StudentComponent);
    fixture.detectChanges();
    backend.expectOne('/api/sinhvien/me').flush(student);
    backend.expectOne('/api/detai').flush([topic]);
    backend.expectOne('/api/dangky/me').flush([]);
    fixture.detectChanges();
    backend.expectOne('/api/auth/google/config').flush({ clientId: '' });
    expect(fixture.nativeElement.textContent).toContain('Nguyễn Văn An');
    fixture.componentInstance.register(topic);
    const create = backend.expectOne('/api/dangky/me');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({ maDT: 1 });
    create.flush({ message: 'created', data: { MaDK: 1, MaSV: 'SV001', HoTenSinhVien: 'Student', MaDT: 1, TenDeTai: 'Topic', NgayDangKy: '2026-10-21', TrangThai: 'Chờ duyệt' } });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Chờ duyệt');
    expect(fixture.nativeElement.textContent).toContain('Đã đăng ký');
    fixture.componentInstance.register(topic);
    backend.expectNone(request => request.method === 'POST');
  });

  it('keeps the profile visible when topics fail to load', () => {
    const fixture = TestBed.createComponent(StudentComponent);
    fixture.detectChanges();
    backend.expectOne('/api/sinhvien/me').flush(student);
    backend.expectOne('/api/detai').flush({}, { status: 503, statusText: 'Unavailable' });
    backend.expectOne('/api/dangky/me').flush([]);
    fixture.detectChanges();
    backend.expectOne('/api/auth/google/config').flush({ clientId: '' });
    expect(fixture.nativeElement.textContent).toContain(student.HoTen);
    expect(fixture.componentInstance.topicsError()).toBeTruthy();
  });

  it('links Google directly without requesting an email code', () => {
    const fixture = TestBed.createComponent(StudentComponent);
    fixture.detectChanges();
    backend.expectOne('/api/sinhvien/me').flush(student);
    backend.expectOne('/api/detai').flush([]);
    backend.expectOne('/api/dangky/me').flush([]);
    fixture.componentInstance.linkGoogle('google-id-token');
    const link = backend.expectOne('/api/auth/google/link');
    expect(link.request.method).toBe('POST');
    expect(link.request.body).toEqual({ credential: 'google-id-token' });
    backend.expectNone('/api/auth/google/link/request-code');
    link.flush({ message: 'Đã liên kết tài khoản Google' });
    expect(fixture.componentInstance.linkCompleted()).toBe(true);
    expect(fixture.componentInstance.linkBusy()).toBe(false);
  });

  it('shows a registration failure without reporting success', () => {
    const fixture = TestBed.createComponent(StudentComponent);
    fixture.detectChanges();
    backend.expectOne('/api/sinhvien/me').flush(student);
    backend.expectOne('/api/detai').flush([topic]);
    backend.expectOne('/api/dangky/me').flush([]);
    fixture.componentInstance.register(topic);
    backend.expectOne('/api/dangky/me').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(fixture.componentInstance.submitError()).toBeTruthy();
    expect(fixture.componentInstance.message()).toBe('');
    expect(fixture.componentInstance.registrations()).toEqual([]);
  });
});
