import { HttpClient } from '@angular/common/http';
import { effect, inject, Injectable, signal } from '@angular/core';
import { tap } from 'rxjs';
import { API_BASE, MutationResponse } from '../../core/api';
import { HealthStore } from '../../core/health.store';
import { SessionService } from '../../core/session.service';

export interface DangKy {
  MaDK: number;
  MaSV: string;
  MaDT: number;
  NgayDangKy: string | null;
  TrangThai: string | null;
}
export interface DangKyBody {
  maSV: string;
  maDT: number;
  ngayDangKy?: string | null;
  trangThai?: string | null;
}

@Injectable({ providedIn: 'root' })
export class DangKyService extends HealthStore {
  private readonly apiHttp = inject(HttpClient);
  private readonly authSession = inject(SessionService);
  private readonly itemsState = signal<DangKy[]>([]);
  readonly items = this.itemsState.asReadonly();

  constructor() {
    super('dangky');
    effect(() => {
      if (!this.authSession.authenticated()) this.itemsState.set([]);
    });
  }

  list() {
    return this.apiHttp
      .get<DangKy[]>(API_BASE + '/dangky')
      .pipe(tap((data) => this.itemsState.set(data)));
  }

  findOne(id: number) {
    return this.apiHttp.get<DangKy>(API_BASE + '/dangky/' + id);
  }

  create(body: DangKyBody) {
    return this.apiHttp
      .post<MutationResponse<DangKy>>(API_BASE + '/dangky', body)
      .pipe(tap(({ data }) => this.upsert(data)));
  }

  update(id: number, body: Partial<DangKyBody>) {
    return this.apiHttp
      .patch<MutationResponse<DangKy>>(API_BASE + '/dangky/' + id, body)
      .pipe(tap(({ data }) => this.upsert(data)));
  }

  remove(id: number) {
    return this.apiHttp
      .delete<MutationResponse<Pick<DangKy, 'MaDK'>>>(API_BASE + '/dangky/' + id)
      .pipe(
        tap(() =>
          this.itemsState.update((items) =>
            items.filter((item) => Number(item.MaDK) !== Number(id)),
          ),
        ),
      );
  }

  private upsert(data: DangKy) {
    this.itemsState.update((items) =>
      [data, ...items.filter((item) => Number(item.MaDK) !== Number(data.MaDK))].sort(
        (a, b) => Number(b.MaDK) - Number(a.MaDK),
      ),
    );
  }
}
