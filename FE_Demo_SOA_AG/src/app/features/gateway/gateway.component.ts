import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../core/session.service';
import { GatewayService } from './gateway.service';

@Component({
  selector: 'app-gateway',
  imports: [RouterLink, DatePipe],
  template: `
    <section class="page-heading">
      <div>
        <span class="eyebrow">KHÔNG GIAN QUẢN LÝ</span>
        <h1>Tổng quan</h1>
        <p class="muted">Chào {{ session.username() }}, mọi kết nối bắt đầu từ đây.</p>
      </div>
      <button class="button subtle" (click)="store.check()" [disabled]="store.loading()">
        ↻ {{ store.loading() ? 'Đang kiểm tra…' : 'Làm mới trạng thái' }}
      </button>
    </section>
    <section class="welcome-banner">
      <div>
        <span class="eyebrow">QUẢN LÝ ĐỒ ÁN TỐT NGHIỆP</span>
        <h2>Tập trung vào những<br />điều quan trọng.</h2>
        <p>Quản lý hồ sơ sinh viên và theo dõi kết nối các dịch vụ trong cùng một không gian.</p>
        <a class="button light" routerLink="/sinh-vien">Mở danh sách sinh viên ↗</a>
      </div>
      <div class="banner-art" aria-hidden="true">
        <span class="art-square square-one"></span><span class="art-square square-two"></span
        ><span class="art-circle"></span
        ><span class="art-label">SOA<br /><small>CAMPUS</small></span>
      </div>
    </section>
    <div class="section-heading">
      <div>
        <h2>Kết nối hệ thống</h2>
        <p class="muted">Trạng thái được kiểm tra trực tiếp từ máy chủ.</p>
      </div>
      <span
        class="status-pill"
        [class.online]="store.health()?.status === 'ok'"
        [class.pending]="store.health()?.status !== 'ok'"
        >{{
          store.loading()
            ? 'Đang kiểm tra'
            : store.health()
              ? upCount() + '/4 dịch vụ hoạt động'
              : 'Chưa có kết quả'
        }}</span
      >
    </div>
    @if (store.error()) {
      <p class="alert error" role="alert">{{ store.error() }}</p>
    }
    <div class="service-grid">
      @for (item of services; track item.key) {
        <a class="panel service-card" [routerLink]="item.path">
          <div class="service-card-top">
            <span class="service-symbol" aria-hidden="true">{{ item.icon }}</span
            ><span aria-hidden="true">↗</span>
          </div>
          <h3>{{ item.label }}</h3>
          <p class="muted">{{ item.description }}</p>
          @if (store.loading()) {
            <span class="status-pill pending">Đang kiểm tra</span>
          } @else if (store.health()?.services?.[item.key] === 'up') {
            <span class="status-pill online"><span class="status-dot"></span> Hoạt động</span>
          } @else if (store.health()?.services?.[item.key] === 'down') {
            <span class="status-pill offline">● Không khả dụng</span>
          } @else {
            <span class="status-pill pending">Chưa có kết quả</span>
          }
        </a>
      }
    </div>
    @if (store.health(); as health) {
      <p class="last-checked">
        Kiểm tra gần nhất: {{ health.timestamp | date: 'HH:mm:ss · dd/MM/yyyy' }}
      </p>
    }
  `,
})
export class GatewayComponent implements OnInit {
  readonly store = inject(GatewayService);
  readonly session = inject(SessionService);
  readonly upCount = computed(
    () =>
      Object.values(this.store.health()?.services ?? {}).filter((value) => value === 'up').length,
  );
  readonly services = [
    {
      key: 'auth' as const,
      label: 'Tài khoản',
      icon: '◈',
      description: 'Đăng nhập và quản lý phiên truy cập.',
      path: '/tai-khoan',
    },
    {
      key: 'sinhvien' as const,
      label: 'Sinh viên',
      icon: '▤',
      description: 'Danh sách và thông tin hồ sơ sinh viên.',
      path: '/sinh-vien',
    },
    {
      key: 'detai' as const,
      label: 'Đề tài',
      icon: '▧',
      description: 'Dịch vụ quản lý đề tài tốt nghiệp.',
      path: '/de-tai',
    },
    {
      key: 'dangky' as const,
      label: 'Đăng ký',
      icon: '↗',
      description: 'Dịch vụ kết nối sinh viên với đề tài.',
      path: '/dang-ky',
    },
  ];
  ngOnInit(): void {
    this.store.check();
  }
}
