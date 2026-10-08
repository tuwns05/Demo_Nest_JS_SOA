import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SessionService } from '../../core/session.service';
import { SinhVienService } from './sinh-vien.service';

describe('SinhVienService API and state', () => {
  let store: SinhVienService;
  let backend: HttpTestingController;
  let session: SessionService;
  const student = { MaSV: 'SV001', HoTen: 'Nguyễn Văn A', Email: 'a@example.com', Lop: 'CNTT01' };
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    session = TestBed.inject(SessionService);
    session.start(
      'header.' +
        btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) +
        '.signature',
      'demo',
    );
    store = TestBed.inject(SinhVienService);
    backend = TestBed.inject(HttpTestingController);
    TestBed.tick();
  });
  afterEach(() => {
    backend.verify();
    session.end();
    sessionStorage.clear();
  });

  it('loads list and detail into service state', () => {
    store.list().subscribe();
    backend.expectOne('/api/sinhvien').flush([student]);
    expect(store.students()).toEqual([student]);
    store.findOne('SV001').subscribe();
    backend.expectOne('/api/sinhvien/SV001').flush(student);
    expect(store.selected()).toEqual(student);
  });

  it('creates, updates and deletes using backend field conventions', () => {
    const body = {
      maSV: 'SV001',
      hoTen: student.HoTen,
      email: student.Email,
      lop: student.Lop,
      matKhau: '123456',
    };
    store.create(body).subscribe();
    const create = backend.expectOne('/api/sinhvien');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(body);
    create.flush({ message: 'created', data: student });
    expect(store.students()).toEqual([student]);

    store.update('SV001', { lop: 'CNTT02' }).subscribe();
    const update = backend.expectOne('/api/sinhvien/SV001');
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual({ lop: 'CNTT02' });
    update.flush({ message: 'updated', data: { ...student, Lop: 'CNTT02' } });
    expect(store.students()[0].Lop).toBe('CNTT02');

    store.remove('SV001').subscribe();
    const remove = backend.expectOne('/api/sinhvien/SV001');
    expect(remove.request.method).toBe('DELETE');
    remove.flush({ message: 'deleted', data: student });
    expect(store.students()).toEqual([]);
    expect(store.selected()).toBeNull();
  });

  it('keeps existing data on failed mutations', () => {
    store.list().subscribe();
    backend.expectOne('/api/sinhvien').flush([student]);
    store.remove('SV001').subscribe({ error: () => {} });
    backend.expectOne('/api/sinhvien/SV001').flush({}, { status: 409, statusText: 'Conflict' });
    expect(store.students()).toEqual([student]);
  });

  it('encodes IDs and clears cached data on logout', () => {
    store.findOne('SV/001').subscribe();
    backend.expectOne('/api/sinhvien/SV%2F001').flush(student);
    session.end();
    TestBed.tick();
    expect(store.selected()).toBeNull();
    expect(store.students()).toEqual([]);
  });
});
