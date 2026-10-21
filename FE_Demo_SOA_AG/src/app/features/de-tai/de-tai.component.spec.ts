import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { authInterceptor } from '../../core/auth.interceptor';
import { SessionService } from '../../core/session.service';
import { DeTaiComponent } from './de-tai.component';

describe('DeTai CRUD screen', () => {
  let fixture: ComponentFixture<DeTaiComponent>;
  let page: DeTaiComponent;
  let backend: HttpTestingController;
  let session: SessionService;
  const item = { MaDT: 1, TenDT: 'Quản lý đồ án', MoTa: null, GiangVienHD: null };
  const token =
    'header.' + btoa(JSON.stringify({ role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 })) + '.signature';

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [DeTaiComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    session = TestBed.inject(SessionService);
    session.start(token, 'admin');
    fixture = TestBed.createComponent(DeTaiComponent);
    page = fixture.componentInstance;
    backend = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    const list = backend.expectOne('/api/detai');
    expect(list.request.headers.get('Authorization')).toBe('Bearer ' + token);
    list.flush([item]);

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
    page.form = { tenDT: ' Đề tài mới ', moTa: '', giangVienHD: '' };
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.nativeElement
      .querySelector('form:not(.table-toolbar)')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const request = backend.expectOne('/api/detai');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe('Bearer ' + token);
    expect(request.request.body).toEqual({ tenDT: 'Đề tài mới', moTa: null, giangVienHD: null });
    request.flush({ message: 'Tạo thành công', data: { ...item, MaDT: 3, TenDT: 'Đề tài mới' } });
    fixture.detectChanges();
    expect(page.mode()).toBeNull();
    expect(page.store.items().length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Tạo thành công');
  });

  it('searches by ID through the authenticated API and renders a fresh result', async () => {
    page.searchCode = ' 7 ';
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.nativeElement
      .querySelector('form.table-toolbar')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const request = backend.expectOne('/api/detai/7');
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer ' + token);
    const found = { ...item, MaDT: 7 };
    request.flush(found);
    fixture.detectChanges();
    expect(page.visibleItems()).toEqual([found]);
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Xem tất cả');
  });

  it('handles missing IDs without displaying stale cached records and can show all again', () => {
    page.searchCode = '1';
    page.search();
    backend
      .expectOne('/api/detai/1')
      .flush({ message: 'Không tìm thấy' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(page.visibleItems()).toEqual([]);
    expect(page.loading()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Không tìm thấy');
    expect(fixture.nativeElement.textContent).toContain('Không có kết quả tìm kiếm.');
    page.reload();
    backend.expectOne('/api/detai').flush([item]);

    expect(page.searchId()).toBeNull();
    expect(page.visibleItems()).toEqual([item]);
    expect(page.error()).toBe('');
  });

  it('rejects invalid search IDs without sending HTTP requests', () => {
    for (const code of ['abc', '0', '-1', '1.5', '2147483648']) {
      page.searchCode = code;
      page.search();
      expect(page.error()).toContain('phải là số nguyên');
    }
    backend.expectNone((request) => request.url.startsWith('/api/detai'));
  });

  it('loads fresh detail and PATCHes the edited record', () => {
    page.open(item, 'detail');
    const detail = backend.expectOne('/api/detai/1');
    expect(detail.request.method).toBe('GET');
    detail.flush(item);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]').textContent).toContain(
      'Quản lý đồ án',
    );
    page.mode.set('edit');
    page.form.moTa = 'Nội dung mới';
    page.save();
    const update = backend.expectOne('/api/detai/1');
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body.moTa).toBe('Nội dung mới');
    update.flush({ message: 'Đã cập nhật', data: { ...item, MoTa: 'Nội dung mới' } });
    expect(page.store.items()[0].MoTa).toBe('Nội dung mới');
  });

  it('keeps the record and dialog on delete failure, then allows retry', () => {
    page.askDelete(item);
    page.remove();
    backend
      .expectOne('/api/detai/1')
      .flush({ message: 'Không thể xóa' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect(page.mode()).toBe('delete');
    expect(page.busy()).toBe(false);
    expect(page.store.items()).toEqual([item]);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Không thể xóa',
    );
    page.remove();
    const deletion = backend.expectOne('/api/detai/1');
    expect(deletion.request.method).toBe('DELETE');
    deletion.flush({ message: 'Đã xóa', data: { MaDT: 1 } });
    expect(page.store.items()).toEqual([]);
    expect(page.mode()).toBeNull();
  });

  it('does not submit missing required fields and clears cached data on logout', () => {
    page.openCreate();
    page.save();
    backend.expectNone('/api/detai');
    expect(page.error()).toBeTruthy();
    session.end();
    TestBed.tick();
    expect(page.store.items()).toEqual([]);
  });
});
