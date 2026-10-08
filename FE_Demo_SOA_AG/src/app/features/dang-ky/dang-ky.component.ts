import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  readonly mode = signal<'create' | 'edit' | 'detail' | 'delete' | null>(null);
  readonly current = signal<DangKy | null>(null);
  form = this.emptyForm();

  ngOnInit() {
    this.reload();
  }

  reload() {
    if (this.loading() || this.busy()) return;
    this.loading.set(true);
    this.error.set('');
    forkJoin([this.store.list(), this.students.list(), this.topics.list()])
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({ error: (error) => this.error.set(apiError(error)) });
  }

  openCreate() {
    if (this.busy() || this.loading()) return;
    this.current.set(null);
    this.form = this.emptyForm();
    this.error.set('');
    this.message.set('');
    this.mode.set('create');
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
    if (!this.form.maSV || !this.form.maDT) {
      this.error.set('Vui lòng chọn sinh viên và đề tài.');
      return;
    }
    const body: DangKyBody = {
      maSV: this.form.maSV,
      maDT: Number(this.form.maDT),
      trangThai: this.form.trangThai.trim() || null,
    };
    if (this.form.ngayDangKy) body.ngayDangKy = this.form.ngayDangKy;
    else if (mode === 'edit') body.ngayDangKy = null;
    const operation =
      mode === 'create' ? this.store.create(body) : this.store.update(this.current()!.MaDK, body);
    this.busy.set(true);
    this.error.set('');
    operation
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.message.set(result.message);
          this.mode.set(null);
          this.current.set(null);
          this.form = this.emptyForm();
        },
        error: (error) => this.error.set(apiError(error)),
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

  studentName(maSV: string) {
    return (
      this.students.students().find((item) => item.MaSV === maSV)?.HoTen ??
      'Sinh viên không còn trong danh sách'
    );
  }

  topicName(maDT: number) {
    return (
      this.topics.items().find((item) => Number(item.MaDT) === Number(maDT))?.TenDT ??
      'Đề tài không còn trong danh sách'
    );
  }

  private emptyForm() {
    return { maSV: '', maDT: null as number | null, ngayDangKy: '', trangThai: '' };
  }
}
