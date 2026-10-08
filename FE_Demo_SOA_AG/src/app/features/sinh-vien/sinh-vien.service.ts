import { HttpClient } from '@angular/common/http';
import { effect, inject, Injectable, signal } from '@angular/core';
import { tap } from 'rxjs';
import { API_BASE, MutationResponse } from '../../core/api';
import { SessionService } from '../../core/session.service';

export interface SinhVien {
  MaSV: string;
  HoTen: string;
  Email: string;
  Lop: string;
}
export interface CreateSinhVien {
  maSV: string;
  hoTen: string;
  email: string;
  lop: string;
  matKhau: string;
}
export type UpdateSinhVien = Partial<Omit<CreateSinhVien, 'maSV'>>;

@Injectable({ providedIn: 'root' })
export class SinhVienService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly state = signal<SinhVien[]>([]);
  readonly students = this.state.asReadonly();
  readonly selected = signal<SinhVien | null>(null);

  constructor() {
    effect(() => {
      if (!this.session.authenticated()) {
        this.state.set([]);
        this.selected.set(null);
      }
    });
  }

  list() {
    return this.http
      .get<SinhVien[]>(API_BASE + '/sinhvien')
      .pipe(tap((data) => this.state.set(data)));
  }

  findOne(maSV: string) {
    return this.http.get<SinhVien>(this.url(maSV)).pipe(tap((data) => this.selected.set(data)));
  }

  create(body: CreateSinhVien) {
    return this.http
      .post<MutationResponse<SinhVien>>(API_BASE + '/sinhvien', body)
      .pipe(tap(({ data }) => this.upsert(data)));
  }

  update(maSV: string, body: UpdateSinhVien) {
    return this.http.patch<MutationResponse<SinhVien>>(this.url(maSV), body).pipe(
      tap(({ data }) => {
        this.upsert(data);
        this.selected.set(data);
      }),
    );
  }

  remove(maSV: string) {
    return this.http.delete<MutationResponse<SinhVien>>(this.url(maSV)).pipe(
      tap(() => {
        this.state.update((items) => items.filter((item) => item.MaSV !== maSV));
        if (this.selected()?.MaSV === maSV) this.selected.set(null);
      }),
    );
  }

  private upsert(student: SinhVien): void {
    this.state.update((items) =>
      [...items.filter((item) => item.MaSV !== student.MaSV), student].sort((a, b) =>
        a.MaSV.localeCompare(b.MaSV),
      ),
    );
  }

  private url(maSV: string): string {
    return API_BASE + '/sinhvien/' + encodeURIComponent(maSV);
  }
}
