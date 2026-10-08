import { HttpClient } from '@angular/common/http';
import { DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { API_BASE, apiError, ServiceHealth } from './api';
import { SessionService } from './session.service';

// Dùng chung cơ chế đọc health; mỗi service con giữ trạng thái riêng.
export abstract class HealthStore {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly session = inject(SessionService);
  private readonly state = signal<ServiceHealth | null>(null);
  readonly health = this.state.asReadonly();
  readonly loading = signal(false);
  readonly error = signal('');

  constructor(private readonly resource: string) {
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
      .get<ServiceHealth>(API_BASE + '/' + this.resource + '/health')
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (result) => this.state.set(result),
        error: (error) => {
          const body =
            error.error?.message && typeof error.error.message === 'object'
              ? error.error.message
              : error.error;
          if (error.status === 503 && body?.service === this.resource && body?.status === 'down') {
            this.state.set({ status: 'down', service: this.resource });
          } else this.error.set(apiError(error));
        },
      });
  }
}
