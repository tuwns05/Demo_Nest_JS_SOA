import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { Router } from '@angular/router';

interface Session {
  token: string;
  username: string;
  expiresAt: number;
}
const STORAGE_KEY = 'soa.session';

@Injectable({ providedIn: 'root' })
export class SessionService implements OnDestroy {
  private readonly router = inject(Router);
  private readonly state = signal<Session | null>(this.restore());
  private timer?: ReturnType<typeof setTimeout>;
  readonly token = computed(() => this.state()?.token ?? null);
  readonly username = computed(() => this.state()?.username ?? '');
  readonly authenticated = computed(() => this.state() !== null);

  constructor() {
    this.scheduleExpiry();
  }

  ngOnDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
  }

  start(token: string, username: string): void {
    // Đọc exp để quản lý phiên ở UI; backend vẫn xác minh chữ ký JWT.
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
      exp: number;
    };
    if (!Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now()) {
      throw new Error('Token không có thời hạn hợp lệ');
    }
    const session = { token, username, expiresAt: payload.exp * 1000 };
    this.state.set(session);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      /* Phiên vẫn hoạt động trong bộ nhớ. */
    }
    this.scheduleExpiry();
  }

  end(expired = false): void {
    if (this.timer) clearTimeout(this.timer);
    this.state.set(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* Trình duyệt có thể chặn storage. */
    }
    void this.router.navigate(['/dang-nhap'], { queryParams: expired ? { expired: '1' } : {} });
  }

  private restore(): Session | null {
    try {
      const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null') as Session | null;
      if (
        value &&
        typeof value.token === 'string' &&
        typeof value.username === 'string' &&
        typeof value.expiresAt === 'number' &&
        value.expiresAt > Date.now()
      )
        return value;
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* Không có phiên được lưu. */
    }
    return null;
  }

  private scheduleExpiry(): void {
    if (this.timer) clearTimeout(this.timer);
    const session = this.state();
    if (!session) return;
    const remaining = session.expiresAt - Date.now();
    this.timer = setTimeout(
      () => {
        if (session.expiresAt <= Date.now()) this.end(true);
        else this.scheduleExpiry();
      },
      Math.min(Math.max(remaining, 0), 2_147_483_647),
    );
  }
}
