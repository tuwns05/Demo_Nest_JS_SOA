import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { apiError } from '../../core/api';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-auth',
  imports: [FormsModule],
  templateUrl: './auth.component.html',
})
export class AuthComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  user = '';
  password = '';
  readonly busy = signal(false);
  readonly error = signal('');
  readonly expired = this.route.snapshot.queryParamMap.has('expired');

  login(): void {
    if (this.busy()) return;
    if (!this.user.trim()) {
      this.error.set('Vui lòng nhập tài khoản quản trị.');
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
          const target = this.route.snapshot.queryParamMap.get('returnUrl');
          void this.router.navigateByUrl(
            target?.startsWith('/') && !target.startsWith('//') ? target : '/sinh-vien',
          );
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
