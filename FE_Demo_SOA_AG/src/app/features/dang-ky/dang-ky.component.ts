import { Component, inject, OnInit } from '@angular/core';
import { HealthPanelComponent } from '../../shared/health-panel.component';
import { DangKyService } from './dang-ky.service';

@Component({
  selector: 'app-dang-ky',
  imports: [HealthPanelComponent],
  template: `
    <section class="page-heading">
      <div>
        <span class="eyebrow">HÀNH TRÌNH ĐỒ ÁN</span>
        <h1>Đăng ký</h1>
        <p class="muted">Theo dõi kết nối dịch vụ đăng ký đề tài.</p>
      </div>
      <span class="status-pill pending">Đang phát triển</span>
    </section>
    <app-health-panel
      [health]="store.health()"
      [loading]="store.loading()"
      [error]="store.error()"
      (refresh)="store.check()"
    />
    <section class="panel coming-soon">
      <span class="feature-icon" aria-hidden="true">↗</span
      ><span class="eyebrow">ĐĂNG KÝ ĐỀ TÀI</span>
      <h2>Kết nối sinh viên với đề tài</h2>
      <p>Chức năng đăng ký và theo dõi đề tài của sinh viên sẽ có tại đây khi được triển khai.</p>
      <div class="coming-note">Hiện dịch vụ mới hỗ trợ kiểm tra kết nối.</div>
    </section>
  `,
})
export class DangKyComponent implements OnInit {
  readonly store = inject(DangKyService);
  ngOnInit(): void {
    this.store.check();
  }
}
