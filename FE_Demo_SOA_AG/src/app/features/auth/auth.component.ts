import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { apiError } from '../../core/api';
import { AuthService } from './auth.service';
import { GoogleButtonComponent } from './google-button.component';

@Component({
  selector: 'app-auth',
  imports: [FormsModule, GoogleButtonComponent],
  templateUrl: './auth.component.html',
})
export class AuthComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  user = '';
  password = '';
  registerEmail = '';
  registerPassword = '';
  registerCode = '';
  readonly registering = signal(false);
  readonly codeSent = signal(false);
  readonly message = signal('');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly expired = this.route.snapshot.queryParamMap.has('expired');

  requestRegistrationCode(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    this.auth.requestAdminRegistration(this.registerEmail.trim())
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: response => { this.codeSent.set(true); this.message.set(response.message); },
        error: error => this.error.set(apiError(error)),
      });
  }

  completeRegistration(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.auth.completeAdminRegistration(this.registerEmail.trim(), this.registerCode.trim(), this.registerPassword)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: response => {
          this.user = this.registerEmail.trim();
          this.registerPassword = '';
          this.registerCode = '';
          this.codeSent.set(false);
          this.registering.set(false);
          this.message.set(response.message);
        },
        error: error => this.error.set(apiError(error)),
      });
  }

  loginWithGoogle(credential: string): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.auth.loginWithGoogle(credential)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => this.navigateAfterLogin(),
        error: (error) => this.error.set(apiError(error)),
      });
  }

  private navigateAfterLogin(): void {
    const target = this.route.snapshot.queryParamMap.get('returnUrl');
    void this.router.navigateByUrl(
      this.auth.session.role() === 'student'
        ? this.auth.session.home()
        : target?.startsWith('/') && !target.startsWith('//') ? target : this.auth.session.home(),
    );
  }

  login(): void {
    if (this.busy()) return;
    if (!this.user.trim()) {
      this.error.set('Vui lòng nhập tài khoản.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.auth
      .login(this.user.trim(), this.password)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          this.password = '';
          this.navigateAfterLogin();
        },
        error: (error) => {
          this.password = '';
          this.error.set(
            error.status === 401 ? 'Tài khoản hoặc mật khẩu chưa đúng.' : apiError(error),
          );
        },
      });
  }
}
