import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, of, throwError } from 'rxjs';
import { API_BASE, apiError } from '../../core/api';
import { SessionService } from '../../core/session.service';

export interface GatewayHealth {
  status: 'ok' | 'degraded';
  gateway: 'up';
  services: Record<'auth' | 'sinhvien' | 'detai' | 'dangky', 'up' | 'down'>;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class GatewayService {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly session = inject(SessionService);
  private readonly state = signal<GatewayHealth | null>(null);
  readonly health = this.state.asReadonly();
  readonly loading = signal(false);
  readonly error = signal('');

  constructor() {
    effect(() => {
      if (!this.session.authenticated()) {
        this.state.set(null);
        this.error.set('');
      }
    });
  }

  check(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.state.set(null);
    this.http
      .get<GatewayHealth>(API_BASE + '/health')
      .pipe(
        catchError((error: HttpErrorResponse) => {
          // Gateway trả HTTP 503 kèm bản tổng hợp hợp lệ nếu một dịch vụ down.
          const body = error.error as Partial<GatewayHealth> | null;
          if (
            error.status === 503 &&
            body?.status === 'degraded' &&
            body.services &&
            body.gateway === 'up'
          ) {
            return of(body as GatewayHealth);
          }
          return throwError(() => error);
        }),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (value) => this.state.set(value),
        error: (error) => this.error.set(apiError(error)),
      });
  }
}
