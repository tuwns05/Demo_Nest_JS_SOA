import { Component, input, output } from '@angular/core';
import { ServiceHealth } from '../core/api';

@Component({
  selector: 'app-health-panel',
  template: `
    <section class="panel health-panel">
      <div>
        <span class="eyebrow">KẾT NỐI DỊCH VỤ</span>
        <h2>Trạng thái hiện tại</h2>
        <p class="muted">Kiểm tra kết nối dịch vụ và cơ sở dữ liệu.</p>
      </div>
      <div class="health-result" aria-live="polite">
        @if (loading()) {
          <span class="status-pill pending"><span class="loader"></span> Đang kiểm tra</span>
        } @else if (health()?.status === 'ok') {
          <span class="status-pill online"><span class="status-dot"></span> Đang hoạt động</span>
        } @else if (health()?.status === 'down') {
          <span class="status-pill offline">● Không khả dụng</span>
        } @else {
          <span class="status-pill pending">Chưa có kết quả</span>
        }
        <button
          class="icon-button refresh-button"
          [attr.aria-label]="loading() ? 'Đang kiểm tra kết nối' : 'Kiểm tra lại kết nối'"
          [attr.title]="loading() ? 'Đang kiểm tra kết nối' : 'Kiểm tra lại kết nối'"
          [disabled]="loading()"
          (click)="refresh.emit()"
        >
          <span aria-hidden="true">↻</span>
        </button>
      </div>
      @if (error()) {
        <p class="alert error health-error" role="alert">{{ error() }}</p>
      }
    </section>
  `,
})
export class HealthPanelComponent {
  readonly health = input<ServiceHealth | null>(null);
  readonly loading = input(false);
  readonly error = input('');
  readonly refresh = output<void>();
}
