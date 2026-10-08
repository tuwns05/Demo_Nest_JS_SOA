import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { authInterceptor } from '../../core/auth.interceptor';
import { SessionService } from '../../core/session.service';
import { DangKyComponent } from './dang-ky.component';

describe('DangKy CRUD screen', () => {
  let fixture: ComponentFixture<DangKyComponent>;
  let page: DangKyComponent;
  let backend: HttpTestingController;
  let session: SessionService;
  const item = {
    MaDK: 1,
    MaSV: 'SV001',
    MaDT: 2,
    NgayDangKy: '2026-10-09T00:00:00.000Z',
    TrangThai: 'Chờ duyệt',
  };
  const token =
    'header.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) + '.signature';

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [DangKyComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    session = TestBed.inject(SessionService);
    session.start(token, 'admin');
    fixture = TestBed.createComponent(DangKyComponent);
    page = fixture.componentInstance;
    backend = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    const list = backend.expectOne('/api/dangky');
    expect(list.request.headers.get('Authorization')).toBe('Bearer ' + token);
    list.flush([item]);
    backend
      .expectOne('/api/sinhvien')
      .flush([{ MaSV: 'SV001', HoTen: 'Nguyễn Văn A', Email: 'a@example.com', Lop: 'CNTT' }]);
    backend
      .expectOne('/api/detai')
      .flush([{ MaDT: '2', TenDT: 'Quản lý đồ án', MoTa: null, GiangVienHD: null }]);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    backend.verify();
    fixture.destroy();
    session.end();
    sessionStorage.clear();
  });

  it('renders backend data, submits creation and updates the list', async () => {
    expect(fixture.nativeElement.textContent).toContain('Quản lý đồ án');
    page.openCreate();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#maSV').textContent).toContain('Nguyễn Văn A');
    expect(fixture.nativeElement.querySelector('#maDT').textContent).toContain('Quản lý đồ án');
    page.form = { maSV: 'SV001', maDT: 2, ngayDangKy: '', trangThai: ' Chờ duyệt ' };
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const request = backend.expectOne('/api/dangky');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe('Bearer ' + token);
    expect(request.request.body).toEqual({ maSV: 'SV001', maDT: 2, trangThai: 'Chờ duyệt' });
    request.flush({ message: 'Tạo thành công', data: { ...item, MaDK: 3 } });
    fixture.detectChanges();
    expect(page.mode()).toBeNull();
    expect(page.store.items().length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Tạo thành công');
  });

  it('loads fresh detail and PATCHes the edited record', () => {
    page.open(item, 'detail');
    const detail = backend.expectOne('/api/dangky/1');
    expect(detail.request.method).toBe('GET');
    detail.flush(item);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]').textContent).toContain('SV001');
    page.mode.set('edit');
    page.form.trangThai = 'Đã duyệt';
    page.save();
    const update = backend.expectOne('/api/dangky/1');
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body.maDT).toBe(2);
    expect(update.request.body.ngayDangKy).toBe('2026-10-09');
    expect(update.request.body.trangThai).toBe('Đã duyệt');
    update.flush({ message: 'Đã cập nhật', data: { ...item, TrangThai: 'Đã duyệt' } });
    expect(page.store.items()[0].TrangThai).toBe('Đã duyệt');
  });

  it('keeps the record and dialog on delete failure, then allows retry', () => {
    page.askDelete(item);
    page.remove();
    backend
      .expectOne('/api/dangky/1')
      .flush({ message: 'Không thể xóa' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect(page.mode()).toBe('delete');
    expect(page.busy()).toBe(false);
    expect(page.store.items()).toEqual([item]);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Không thể xóa',
    );
    page.remove();
    const deletion = backend.expectOne('/api/dangky/1');
    expect(deletion.request.method).toBe('DELETE');
    deletion.flush({ message: 'Đã xóa', data: { MaDK: 1 } });
    expect(page.store.items()).toEqual([]);
    expect(page.mode()).toBeNull();
  });

  it('does not submit missing required fields and clears cached data on logout', () => {
    page.openCreate();
    page.save();
    backend.expectNone('/api/dangky');
    expect(page.error()).toBeTruthy();
    session.end();
    TestBed.tick();
    expect(page.store.items()).toEqual([]);
  });
});
