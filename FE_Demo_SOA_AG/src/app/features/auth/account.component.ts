import { Component, inject } from '@angular/core';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-account',
  template: `
    <section class="page-heading">
      <div>
        <span class="eyebrow">PHIÊN TRUY CẬP</span>
        <h1>Tài khoản</h1>
        <p class="muted">Thông tin phiên đăng nhập hiện tại.</p>
      </div>
    </section>
    <section class="panel account-panel">
      <span class="avatar large">{{ auth.session.username().slice(0, 2).toUpperCase() }}</span>
      <div>
        <h2>{{ auth.session.username() }}</h2>
        <p class="muted">Đang đăng nhập</p>
      </div>
      <button class="button subtle" (click)="auth.logout()">Đăng xuất</button>
    </section>
    <p class="muted account-note">Đăng xuất để kết thúc phiên và chuyển sang tài khoản khác.</p>
  `,
})
export class AccountComponent {
  readonly auth = inject(AuthService);
}
