import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { API_BASE, MutationResponse, apiError } from '../../core/api';
import { SinhVien } from '../sinh-vien/sinh-vien.service';
import { DeTai } from '../de-tai/de-tai.service';
import { DangKy } from '../dang-ky/dang-ky.service';

@Component({
  selector: 'app-student',
  imports: [DatePipe],
  templateUrl: './student.component.html',
  styleUrl: './student.component.css',
})
export class StudentComponent implements OnInit {
  private readonly http = inject(HttpClient);
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
  readonly submitting = signal<number | null>(null);
  readonly registeredIds = computed(() => new Set(this.registrations().map(item => Number(item.MaDT))));

  ngOnInit(): void {
    this.loadProfile();
    this.loadTopics();
    this.loadRegistrations();
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
