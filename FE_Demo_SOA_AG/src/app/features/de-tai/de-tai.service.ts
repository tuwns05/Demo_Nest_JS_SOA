import { HttpClient } from '@angular/common/http';
import { effect, inject, Injectable, signal } from '@angular/core';
import { tap } from 'rxjs';
import { API_BASE, MutationResponse } from '../../core/api';
import { HealthStore } from '../../core/health.store';
import { SessionService } from '../../core/session.service';

export interface DeTai {
  MaDT: number;
  TenDT: string;
  MoTa: string | null;
  GiangVienHD: string | null;
}
export interface DeTaiBody {
  tenDT: string;
  moTa?: string | null;
  giangVienHD?: string | null;
}

@Injectable({ providedIn: 'root' })
export class DeTaiService extends HealthStore {
  private readonly apiHttp = inject(HttpClient);
  private readonly authSession = inject(SessionService);
  private readonly itemsState = signal<DeTai[]>([]);
  readonly items = this.itemsState.asReadonly();

  constructor() {
    super('detai');
    effect(() => {
      if (!this.authSession.authenticated()) this.itemsState.set([]);
    });
  }

  list() {
    return this.apiHttp
      .get<DeTai[]>(API_BASE + '/detai')
      .pipe(tap((data) => this.itemsState.set(data)));
  }

  findOne(id: number) {
    return this.apiHttp.get<DeTai>(API_BASE + '/detai/' + id);
  }

  create(body: DeTaiBody) {
    return this.apiHttp
      .post<MutationResponse<DeTai>>(API_BASE + '/detai', body)
      .pipe(tap(({ data }) => this.upsert(data)));
  }

  update(id: number, body: Partial<DeTaiBody>) {
    return this.apiHttp
      .patch<MutationResponse<DeTai>>(API_BASE + '/detai/' + id, body)
      .pipe(tap(({ data }) => this.upsert(data)));
  }

  remove(id: number) {
    return this.apiHttp
      .delete<MutationResponse<Pick<DeTai, 'MaDT'>>>(API_BASE + '/detai/' + id)
      .pipe(
        tap(() =>
          this.itemsState.update((items) =>
            items.filter((item) => Number(item.MaDT) !== Number(id)),
          ),
        ),
      );
  }

  private upsert(data: DeTai) {
    this.itemsState.update((items) =>
      [data, ...items.filter((item) => Number(item.MaDT) !== Number(data.MaDT))].sort(
        (a, b) => Number(b.MaDT) - Number(a.MaDT),
      ),
    );
  }
}
