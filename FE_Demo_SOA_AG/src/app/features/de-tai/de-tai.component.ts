import { Component, inject, OnInit } from '@angular/core';
import { HealthPanelComponent } from '../../shared/health-panel.component';
import { DeTaiService } from './de-tai.service';

@Component({
  selector: 'app-de-tai',
  imports: [HealthPanelComponent],
  template: `
    <section class="page-heading">
      <div>
        <span class="eyebrow">KHÔNG GIAN ĐỒ ÁN</span>
        <h1>Đề tài</h1>
        <p class="muted">Theo dõi kết nối dịch vụ quản lý đề tài.</p>
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
      <span class="feature-icon" aria-hidden="true">▧</span
      ><span class="eyebrow">QUẢN LÝ ĐỀ TÀI</span>
      <h2>Không gian cho những ý tưởng mới</h2>
      <p>Chức năng danh sách, thêm và cập nhật đề tài sẽ có tại đây khi được triển khai.</p>
      <div class="coming-note">Hiện dịch vụ mới hỗ trợ kiểm tra kết nối.</div>
    </section>
  `,
})
export class DeTaiComponent implements OnInit {
  readonly store = inject(DeTaiService);
  ngOnInit(): void {
    this.store.check();
  }
}
