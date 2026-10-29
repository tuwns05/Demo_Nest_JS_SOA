import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { StudentComponent } from './student.component';

describe('Student portal', () => {
  let backend: HttpTestingController;
  const student = { MaSV: 'SV001', HoTen: 'Nguyễn Văn An', Email: 'an@example.com', Lop: 'CNTT01' };
  const topic = { MaDT: 1, TenDT: 'Ứng dụng SOA', MoTa: 'Quản lý đồ án', GiangVienHD: 'Thầy A' };
  const registration = { MaDK: 5, MaDT: 1, MaSV: 'SV001', HoTenSinhVien: student.HoTen,
    TenDeTai: topic.TenDT, NgayDangKy: '2026-10-29', TrangThai: 'Chờ duyệt' };
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
    backend.expectOne('/api/dangky/occupied-topics').flush([]);
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
    expect(fixture.nativeElement.querySelectorAll('.topic-card').length).toBe(0);
    expect(fixture.nativeElement.querySelector('.student-history').textContent).toContain(topic.TenDT);
    fixture.componentInstance.register(topic);
    backend.expectNone(request => request.method === 'POST');
  });

  it('keeps the profile visible when topics fail to load', () => {
    const fixture = TestBed.createComponent(StudentComponent);
    fixture.detectChanges();
    backend.expectOne('/api/sinhvien/me').flush(student);
    backend.expectOne('/api/dangky/occupied-topics').flush([]);
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
    backend.expectOne('/api/dangky/occupied-topics').flush([]);
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
    backend.expectOne('/api/dangky/occupied-topics').flush([]);
    backend.expectOne('/api/dangky/me').flush([]);
    fixture.componentInstance.register(topic);
    backend.expectOne('/api/dangky/me').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(fixture.componentInstance.submitError()).toBeTruthy();
    expect(fixture.componentInstance.message()).toBe('');
    expect(fixture.componentInstance.registrations()).toEqual([]);
  });

  it('hides topics registered by other students and refreshes stale choices on conflict', () => {
    const fixture = TestBed.createComponent(StudentComponent);
    fixture.detectChanges();
    backend.expectOne('/api/sinhvien/me').flush(student);
    const other = { ...topic, MaDT: 2, TenDT: 'Already taken' };
    backend.expectOne('/api/detai').flush([topic, other]);
    backend.expectOne('/api/dangky/occupied-topics').flush([2]);
    backend.expectOne('/api/dangky/me').flush([]);
    expect(fixture.componentInstance.availableTopics()).toEqual([topic]);
    fixture.componentInstance.register(other);
    backend.expectNone(request => request.method === 'POST');
    fixture.componentInstance.register(topic);
    backend.expectOne('/api/dangky/me').flush({ message: 'Đề tài đã có sinh viên đăng ký' },
      { status: 409, statusText: 'Conflict' });
    backend.expectOne('/api/detai').flush([topic, other]);
    backend.expectOne('/api/dangky/occupied-topics').flush([1, 2]);
    backend.expectOne('/api/dangky/me').flush([]);
    expect(fixture.componentInstance.availableTopics()).toEqual([]);
    expect(fixture.componentInstance.submitError()).toBeTruthy();
  });

  it('prevents an already registered student from choosing another free topic', () => {
    const fixture = TestBed.createComponent(StudentComponent);
    fixture.detectChanges();
    backend.expectOne('/api/sinhvien/me').flush(student);
    backend.expectOne('/api/detai').flush([topic]);
    backend.expectOne('/api/dangky/occupied-topics').flush([2]);
    backend.expectOne('/api/dangky/me').flush([
      { MaDK: 1, MaDT: 2, MaSV: 'SV001', TenDeTai: 'Existing registration' },
    ]);
    fixture.componentInstance.register(topic);
    backend.expectNone(request => request.method === 'POST');
    expect(fixture.componentInstance.availableTopics()).toEqual([]);
  });

  it('confirms cancellation, reloads free topics and allows registering a different topic', () => {
    const fixture = TestBed.createComponent(StudentComponent);
    const page = fixture.componentInstance;
    const nextTopic = { ...topic, MaDT: 3, TenDT: 'New topic' };
    const takenTopic = { ...topic, MaDT: 2, TenDT: 'Taken by another student' };
    fixture.detectChanges();
    backend.expectOne('/api/sinhvien/me').flush(student);
    backend.expectOne('/api/detai').flush([topic, nextTopic, takenTopic]);
    backend.expectOne('/api/dangky/occupied-topics').flush([1, 2]);
    backend.expectOne('/api/dangky/me').flush([registration]);
    fixture.detectChanges();
    backend.expectOne('/api/auth/google/config').flush({ clientId: '' });
    fixture.nativeElement.querySelector('.student-history button[aria-label]').click();
    backend.expectNone(request => request.method === 'DELETE');
    expect(page.cancelTarget()?.MaDK).toBe(5);
    page.cancelRegistration();
    page.cancelRegistration();
    const cancel = backend.expectOne('/api/dangky/me/5');
    expect(cancel.request.method).toBe('DELETE');
    expect(cancel.request.body).toBeNull();
    cancel.flush({ message: 'Hủy đăng ký thành công', data: { MaDK: 5 } });
    backend.expectOne('/api/detai').flush([topic, nextTopic, takenTopic]);
    backend.expectOne('/api/dangky/occupied-topics').flush([2]);
    backend.expectOne('/api/dangky/me').flush([]);
    fixture.detectChanges();
    expect(page.registrations()).toEqual([]);
    expect(page.cancelTarget()).toBeNull();
    expect(page.availableTopics()).toEqual([topic, nextTopic]);
    expect(fixture.nativeElement.querySelectorAll('.topic-card').length).toBe(2);
    page.register(nextTopic);
    const create = backend.expectOne('/api/dangky/me');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({ maDT: 3 });
    create.flush({ message: 'created', data: { ...registration, MaDK: 6, MaDT: 3, TenDeTai: nextTopic.TenDT } });
    expect(page.availableTopics()).toEqual([]);
    expect(page.registrations()[0].MaDT).toBe(3);
  });

  it('keeps a registration after cancellation fails and allows retry', () => {
    const fixture = TestBed.createComponent(StudentComponent);
    const page = fixture.componentInstance;
    fixture.detectChanges();
    backend.expectOne('/api/sinhvien/me').flush(student);
    backend.expectOne('/api/detai').flush([topic]);
    backend.expectOne('/api/dangky/occupied-topics').flush([1]);
    backend.expectOne('/api/dangky/me').flush([registration]);
    page.askCancel(registration);
    page.cancelRegistration();
    backend.expectOne('/api/dangky/me/5').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(page.cancelError()).toBeTruthy();
    expect(page.cancelMessage()).toBe('');
    expect(page.registrations()).toEqual([registration]);
    expect(page.availableTopics()).toEqual([]);
    expect(page.cancelling()).toBeNull();
    page.cancelRegistration();
    backend.expectOne('/api/dangky/me/5').flush({}, { status: 404, statusText: 'Not Found' });
    backend.expectOne('/api/detai').flush([topic]);
    backend.expectOne('/api/dangky/occupied-topics').flush([]);
    backend.expectOne('/api/dangky/me').flush([]);
    expect(page.availableTopics()).toEqual([topic]);
  });
});
