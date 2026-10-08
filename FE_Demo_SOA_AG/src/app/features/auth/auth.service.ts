import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { tap } from 'rxjs';
import { API_BASE } from '../../core/api';
import { SessionService } from '../../core/session.service';

interface LoginResponse {
  access_token: string;
  expires_in: string;
  token_type: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  readonly session = inject(SessionService);

  login(user: string, password: string) {
    return this.http
      .post<LoginResponse>(API_BASE + '/auth/login', { user: user.trim(), password })
      .pipe(tap((response) => this.session.start(response.access_token, user.trim())));
  }

  logout(): void {
    this.session.end();
  }
}
