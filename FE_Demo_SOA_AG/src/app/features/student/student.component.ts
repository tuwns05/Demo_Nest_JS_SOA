import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { GoogleButtonComponent } from '../auth/google-button.component';
import { API_BASE, MutationResponse, apiError } from '../../core/api';
import { SinhVien } from '../sinh-vien/sinh-vien.service';
import { DeTai } from '../de-tai/de-tai.service';
import { DangKy } from '../dang-ky/dang-ky.service';

@Component({
  selector: 'app-student',
  imports: [DatePipe, GoogleButtonComponent],
  templateUrl: './student.component.html',
  styleUrl: './student.component.css',
})
export class StudentComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  readonly profile = signal<SinhVien | null>(null);
  readonly topics = signal<DeTai[]>([]);
  readonly occupiedTopicIds = signal<Set<number>>(new Set());
  readonly availableTopics = computed(() => this.registrations().length ? [] : this.topics().filter(
    topic => !this.occupiedTopicIds().has(Number(topic.MaDT)),
  ));
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
  readonly linkCompleted = signal(false);
  readonly submitting = signal<number | null>(null);
  readonly cancelTarget = signal<DangKy | null>(null);
  readonly cancelling = signal<number | null>(null);
  readonly cancelError = signal('');
  readonly cancelMessage = signal('');

  ngOnInit(): void {
    this.loadProfile();
    this.loadTopics();
    this.loadRegistrations();
  }

  linkGoogle(credential: string): void {
    if (this.linkBusy() || this.linkCompleted() || !this.profile()?.Email) return;
    this.linkBusy.set(true);
    this.linkError.set('');
    this.linkMessage.set('');
    this.auth.linkGoogle(credential)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.linkBusy.set(false)))
      .subscribe({
        next: response => {
          this.linkMessage.set(response.message);
          this.linkCompleted.set(true);
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
    forkJoin({
      topics: this.http.get<DeTai[]>(API_BASE + '/detai'),
      occupied: this.http.get<number[]>(API_BASE + '/dangky/occupied-topics'),
    })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.topicsLoading.set(false)))
      .subscribe({
        next: ({ topics, occupied }) => {
          this.topics.set(topics);
          this.occupiedTopicIds.set(new Set(occupied.map(Number)));
        },
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
    if (this.submitting() !== null || this.cancelling() !== null || !this.profile() || this.topicsLoading() || this.topicsError() || this.registrationsLoading() ||
        this.registrationsError() || this.registrations().length || !this.availableTopics().some(item => Number(item.MaDT) === Number(topic.MaDT))) return;
    this.submitting.set(Number(topic.MaDT));
    this.submitError.set('');
    this.message.set('');
    this.cancelMessage.set('');
    // The backend assigns identity, date and initial status.
    this.http.post<MutationResponse<DangKy>>(API_BASE + '/dangky/me', { maDT: Number(topic.MaDT) })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.submitting.set(null)))
      .subscribe({
        next: response => {
          this.registrations.update(items => [response.data, ...items.filter(item => item.MaDK !== response.data.MaDK)]);
          this.occupiedTopicIds.update(ids => new Set([...ids, Number(topic.MaDT)]));
          this.message.set('Đăng ký đồ án thành công. Trạng thái: Chờ duyệt.');
        },
        error: error => {
          this.submitError.set(apiError(error));
          if (error.status === 409) {
            this.loadTopics();
            this.loadRegistrations();
          }
        },
      });
  }

  askCancel(item: DangKy): void {
    if (this.cancelling() !== null || this.submitting() !== null || this.registrationsLoading() || this.topicsLoading()) return;
    this.cancelTarget.set(item);
    this.cancelError.set('');
    this.cancelMessage.set('');
  }

  cancelRegistration(): void {
    const item = this.cancelTarget();
    if (!item || this.cancelling() !== null || this.submitting() !== null || this.registrationsLoading() || this.topicsLoading()) return;
    this.cancelling.set(item.MaDK);
    this.cancelError.set('');
    this.cancelMessage.set('');
    this.message.set('');
    this.submitError.set('');
    this.http.delete<MutationResponse<Pick<DangKy, 'MaDK'>>>(API_BASE + '/dangky/me/' + item.MaDK)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.cancelling.set(null)))
      .subscribe({
        next: response => {
          this.registrations.update(items => items.filter(value => value.MaDK !== item.MaDK));
          this.cancelTarget.set(null);
          this.cancelMessage.set(response.message);
          this.loadTopics();
          this.loadRegistrations();
        },
        error: error => {
          this.cancelError.set(apiError(error));
          if (error.status === 404) {
            this.cancelTarget.set(null);
            this.loadTopics();
            this.loadRegistrations();
          }
        },
      });
  }

  topicName(maDT: number): string {
    return this.topics().find(topic => Number(topic.MaDT) === Number(maDT))?.TenDT ?? 'Đề tài #' + maDT;
  }
}
