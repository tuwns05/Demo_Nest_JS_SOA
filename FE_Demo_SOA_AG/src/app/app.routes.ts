import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'dang-nhap',
    loadComponent: () => import('./features/auth/auth.component').then((m) => m.AuthComponent),
  },
  {
    path: '',
    canActivateChild: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'tong-quan' },
      {
        path: 'tong-quan',
        loadComponent: () =>
          import('./features/gateway/gateway.component').then((m) => m.GatewayComponent),
      },
      {
        path: 'sinh-vien',
        loadComponent: () =>
          import('./features/sinh-vien/sinh-vien.component').then((m) => m.SinhVienComponent),
      },
      {
        path: 'de-tai',
        loadComponent: () =>
          import('./features/de-tai/de-tai.component').then((m) => m.DeTaiComponent),
      },
      {
        path: 'dang-ky',
        loadComponent: () =>
          import('./features/dang-ky/dang-ky.component').then((m) => m.DangKyComponent),
      },
      {
        path: 'tai-khoan',
        loadComponent: () =>
          import('./features/auth/account.component').then((m) => m.AccountComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'tong-quan' },
];
