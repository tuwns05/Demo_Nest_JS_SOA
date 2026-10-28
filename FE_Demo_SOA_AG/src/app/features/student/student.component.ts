import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/auth.service';
import { GoogleButtonComponent } from '../auth/google-button.component';
import { API_BASE, MutationResponse, apiError } from '../../core/api';
import { SinhVien } from '../sinh-vien/sinh-vien.service';
import { DeTai } from '../de-tai/de-tai.service';
import { DangKy } from '../dang-ky/dang-ky.service';

@Component({
  selector: 'app-student',
  imports: [DatePipe, FormsModule, GoogleButtonComponent],
  templateUrl: './student.component.html',
  styleUrl: './student.component.css',
})
export class StudentComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  readonly profile = signal<SinhVien | null>(null);
  readonly topics = signal<DeTai[]>([]);
  readonly registrations = signal<DangKy[]>([]);
  readonly profileLoading = signal(false);
  readonly topicsLoading = signal(false);
  readonly registrationsLoading = signal(false);
  readonly profileError = signal('');
  readonly topicsError = signal('');
  readonly registrationsError = signal('');
  readonly submitError = signal('');
  readonly message = signal('');
  readonly linkMessage = signal('');
  readonly linkError = signal('');
  readonly linkBusy = signal(false);
  readonly linkCodeSent = signal(false);
  linkCode = '';
  readonly submitting = signal<number | null>(null);
  readonly registeredIds = computed(() => new Set(this.registrations().map(item => Number(item.MaDT))));

  ngOnInit(): void {
    this.loadProfile();
    this.loadTopics();
    this.loadRegistrations();
  }

  requestGoogleLinkCode(): void {
    if (this.linkBusy()) return;
    this.linkBusy.set(true);
    this.linkError.set('');
    this.linkMessage.set('');
    this.auth.requestGoogleLinkCode()
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.linkBusy.set(false)))
      .subscribe({
        next: response => { this.linkCodeSent.set(true); this.linkMessage.set(response.message); },
        error: error => this.linkError.set(apiError(error)),
      });
  }

  linkGoogle(credential: string): void {
    if (this.linkBusy()) return;
    if (!/^[0-9]{6}$/.test(this.linkCode.trim())) {
      this.linkError.set('Nhập mã xác thực gồm 6 chữ số.');
      return;
    }
    this.linkBusy.set(true);
    this.linkError.set('');
    this.auth.linkGoogle(credential, this.linkCode.trim())
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.linkBusy.set(false)))
      .subscribe({
        next: response => {
          this.linkMessage.set(response.message);
          this.linkCode = '';
          this.linkCodeSent.set(false);
        },
        error: error => this.linkError.set(apiError(error)),
      });
  }

  loadProfile(): void {
    if (this.profileLoading()) return;
    this.profileLoading.set(true);
    this.profileError.set('');
    this.http.get<SinhVien>(API_BASE + '/sinhvien/me')
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.profileLoading.set(false)))
      .subscribe({
        next: value => this.profile.set(value),
        error: error => this.profileError.set(apiError(error)),
      });
  }

  loadTopics(): void {
    if (this.topicsLoading()) return;
    this.topicsLoading.set(true);
    this.topicsError.set('');
    this.http.get<DeTai[]>(API_BASE + '/detai')
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.topicsLoading.set(false)))
      .subscribe({
        next: value => this.topics.set(value),
        error: error => this.topicsError.set(apiError(error)),
      });
  }

  loadRegistrations(): void {
    if (this.registrationsLoading()) return;
    this.registrationsLoading.set(true);
    this.registrationsError.set('');
    this.http.get<DangKy[]>(API_BASE + '/dangky/me')
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.registrationsLoading.set(false)))
      .subscribe({
        next: value => this.registrations.set(value),
        error: error => this.registrationsError.set(apiError(error)),
      });
  }

  register(topic: DeTai): void {
    if (this.submitting() !== null || !this.profile() || this.registrationsLoading() ||
        this.registrationsError() || this.registeredIds().has(Number(topic.MaDT))) return;
    this.submitting.set(Number(topic.MaDT));
    this.submitError.set('');
    this.message.set('');
    // The backend assigns identity, date and initial status.
    this.http.post<MutationResponse<DangKy>>(API_BASE + '/dangky/me', { maDT: Number(topic.MaDT) })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.submitting.set(null)))
      .subscribe({
        next: response => {
          this.registrations.update(items => [response.data, ...items.filter(item => item.MaDK !== response.data.MaDK)]);
          this.message.set('Đăng ký đồ án thành công. Trạng thái: Chờ duyệt.');
        },
        error: error => {
          this.submitError.set(apiError(error));
          if (error.status === 409) this.loadRegistrations();
        },
      });
  }

  topicName(maDT: number): string {
    return this.topics().find(topic => Number(topic.MaDT) === Number(maDT))?.TenDT ?? 'Đề tài #' + maDT;
  }
}
