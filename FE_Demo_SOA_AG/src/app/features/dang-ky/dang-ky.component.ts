import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin } from 'rxjs';
import { apiError } from '../../core/api';
import { DialogFocusDirective } from '../../shared/dialog-focus.directive';
import { DangKy, DangKyBody, DangKyService } from './dang-ky.service';
import { SinhVienService } from '../sinh-vien/sinh-vien.service';
import { DeTaiService } from '../de-tai/de-tai.service';

@Component({
  selector: 'app-dang-ky',
  imports: [FormsModule, DialogFocusDirective],
  templateUrl: './dang-ky.component.html',
})
export class DangKyComponent implements OnInit {
  readonly store = inject(DangKyService);
  readonly students = inject(SinhVienService);
  readonly topics = inject(DeTaiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  searchCode = '';
  readonly searchId = signal<number | null>(null);
  private readonly searchFound = signal(false);
  readonly visibleItems = computed(() => {
    const id = this.searchId();
    if (id === null) return this.store.items();
    return this.searchFound() ? this.store.items().filter((item) => Number(item.MaDK) === id) : [];
  });
  readonly mode = signal<'create' | 'edit' | 'detail' | 'delete' | null>(null);
  readonly occupiedTopicIds = signal<Set<number>>(new Set());
  readonly registeredStudentIds = signal<Set<string>>(new Set());
  readonly availableStudents = computed(() => this.students.students().filter(
    student => !this.registeredStudentIds().has(student.MaSV.trim().toUpperCase()),
  ));
  readonly availableTopics = computed(() => this.topics.items().filter(
    topic => !this.occupiedTopicIds().has(Number(topic.MaDT)),
  ));
  readonly current = signal<DangKy | null>(null);
  form = this.emptyForm();

  ngOnInit() {
    this.reload();
  }

  reload() {
    if (this.loading() || this.busy()) return;
    this.searchCode = '';
    this.searchId.set(null);
    this.message.set('');
    this.loading.set(true);
    this.error.set('');
    this.store.list()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({ error: (error) => this.error.set(apiError(error)) });
  }

  search() {
    if (this.loading() || this.busy()) return;
    const code = this.searchCode.trim();
    if (!code) {
      this.reload();
      return;
    }
    const id = Number(code);
    if (!/^\d+$/.test(code) || !Number.isInteger(id) || id < 1 || id > 2147483647) {
      this.error.set('Mã đăng ký phải là số nguyên từ 1 đến 2147483647.');
      return;
    }
    this.searchId.set(id);
    this.searchFound.set(false);
    this.loading.set(true);
    this.error.set('');
    this.message.set('');
    this.store
      .findOne(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: () => this.searchFound.set(true),
        error: (error) => this.error.set(apiError(error)),
      });
  }

  openCreate() {
    if (this.busy() || this.loading()) return;
    this.current.set(null);
    this.form = this.emptyForm();
    this.error.set('');
    this.message.set('');
    this.busy.set(true);
    forkJoin([this.students.list(), this.topics.list(), this.store.occupiedTopicIds(), this.store.registeredStudentIds()])
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: ([, , occupied, registered]) => {
          this.occupiedTopicIds.set(new Set(occupied.map(Number)));
          this.registeredStudentIds.set(new Set(registered.map(id => id.trim().toUpperCase())));
          if (!this.availableStudents().length) {
            this.error.set('Không còn sinh viên chưa đăng ký đề tài.');
            return;
          }
          if (!this.availableTopics().length) {
            this.error.set('Không còn đề tài trống để đăng ký.');
            return;
          }
          this.mode.set('create');
        },
        error: (error) => this.error.set(apiError(error)),
      });
  }

  open(item: DangKy, mode: 'edit' | 'detail') {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    this.store
      .findOne(item.MaDK)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (data) => {
          this.current.set(data);
          this.form = {
            maSV: data.MaSV,
            maDT: Number(data.MaDT),
            ngayDangKy: data.NgayDangKy?.slice(0, 10) ?? '',
            trangThai: data.TrangThai ?? '',
          };
          this.mode.set(mode);
        },
        error: (error) => this.error.set(apiError(error)),
      });
  }

  askDelete(item: DangKy) {
    if (this.busy()) return;
    this.current.set(item);
    this.error.set('');
    this.message.set('');
    this.mode.set('delete');
  }

  close() {
    if (this.busy()) return;
    this.mode.set(null);
    this.current.set(null);
    this.form = this.emptyForm();
  }

  save() {
    const mode = this.mode();
    if (this.busy() || (mode !== 'create' && mode !== 'edit')) return;
    if (mode === 'create' && (!this.form.maSV || !this.form.maDT)) {
      this.error.set('Vui lòng chọn sinh viên và đề tài.');
      return;
    }
    const changes: Pick<DangKyBody, 'ngayDangKy' | 'trangThai'> = {
      trangThai: this.form.trangThai.trim() || null,
    };
    if (this.form.ngayDangKy) changes.ngayDangKy = this.form.ngayDangKy;
    else if (mode === 'edit') changes.ngayDangKy = null;
    const operation =
      mode === 'create'
        ? this.store.create({
            maSV: this.form.maSV,
            maDT: Number(this.form.maDT),
            ...changes,
          })
        : this.store.update(this.current()!.MaDK, changes);
    this.busy.set(true);
    this.error.set('');
    operation
      .pipe(
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) => {
          this.busy.set(false);
          this.message.set(result.message);
          this.mode.set(null);
          this.current.set(null);
          this.form = this.emptyForm();
        },
        error: (error) => {
          this.busy.set(false);
          this.error.set(apiError(error));
          if (mode === 'create' && error.status === 409) {
            this.refreshAvailability();
          }
        },
      });
  }

  private refreshAvailability() {
    this.busy.set(true);
    forkJoin([this.store.occupiedTopicIds(), this.store.registeredStudentIds()])
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.busy.set(false)))
      .subscribe({
        next: ([occupied, registered]) => {
          this.occupiedTopicIds.set(new Set(occupied.map(Number)));
          this.registeredStudentIds.set(new Set(registered.map(id => id.trim().toUpperCase())));
          if (this.form.maDT !== null && this.occupiedTopicIds().has(Number(this.form.maDT))) this.form.maDT = null;
          if (this.registeredStudentIds().has(this.form.maSV.trim().toUpperCase())) this.form.maSV = '';
        },
        error: error => {
          this.mode.set(null);
          this.error.set(apiError(error));
        },
      });
  }

  remove() {
    const item = this.current();
    if (!item || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.store
      .remove(item.MaDK)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.message.set(result.message);
          this.mode.set(null);
          this.current.set(null);
        },
        error: (error) => this.error.set(apiError(error)),
      });
  }

  private emptyForm() {
    return { maSV: '', maDT: null as number | null, ngayDangKy: '', trangThai: '' };
  }
}
