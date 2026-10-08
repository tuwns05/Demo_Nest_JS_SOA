import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from './features/auth/auth.service';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly isLogin = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url.startsWith('/dang-nhap')),
      startWith(this.router.url.startsWith('/dang-nhap')),
    ),
    { initialValue: false },
  );
  readonly navigation = [
    { path: '/tong-quan', label: 'Tổng quan', icon: '◈' },
    { path: '/sinh-vien', label: 'Sinh viên', icon: '▤' },
    { path: '/de-tai', label: 'Đề tài', icon: '▧' },
    { path: '/dang-ky', label: 'Đăng ký', icon: '↗' },
  ];
}
