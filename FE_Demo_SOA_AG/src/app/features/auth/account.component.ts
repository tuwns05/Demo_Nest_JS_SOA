import { Component, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { GoogleButtonComponent } from './google-button.component';
import { apiError } from '../../core/api';

@Component({
  selector: 'app-account',
  imports: [GoogleButtonComponent],
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
        <p class="muted">{{ auth.session.role() === 'student' ? 'Sinh viên' : 'Quản trị viên' }}</p>
      </div>
      <button class="button subtle" (click)="auth.logout()">Đăng xuất</button>
    </section>
    <p class="muted account-note">Đăng xuất để kết thúc phiên và chuyển sang tài khoản khác.</p>
    <section class="panel account-panel">
      <div>
        <h2>Liên kết Google</h2>
        <p class="muted">Liên kết tài khoản Google để đăng nhập lần sau.</p>
        @if (message()) { <p role="status">{{ message() }}</p> }
        <app-google-button (credential)="linkGoogle($event)" (failure)="message.set($event)" />
      </div>
    </section>
  `,
})
export class AccountComponent {
  readonly auth = inject(AuthService);
  readonly message = signal('');

  linkGoogle(credential: string): void {
    this.auth.linkGoogle(credential).subscribe({
      next: response => this.message.set(response.message),
      error: error => this.message.set(apiError(error)),
    });
  }
}
