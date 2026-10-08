import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { apiError } from '../../core/api';
import { DialogFocusDirective } from '../../shared/dialog-focus.directive';
import { CreateSinhVien, SinhVien, SinhVienService, UpdateSinhVien } from './sinh-vien.service';

@Component({
  selector: 'app-sinh-vien',
  imports: [FormsModule, DialogFocusDirective],
  templateUrl: './sinh-vien.component.html',
})
export class SinhVienComponent implements OnInit {
  readonly store = inject(SinhVienService);
  private readonly destroyRef = inject(DestroyRef);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly query = signal('');
  readonly classFilter = signal('');
  readonly mode = signal<'create' | 'edit' | 'detail' | 'delete' | null>(null);
  readonly current = signal<SinhVien | null>(null);
  form: CreateSinhVien = this.emptyForm();
  readonly classes = computed(() =>
    [...new Set(this.store.students().map((item) => item.Lop))].sort(),
  );
  readonly filtered = computed(() => {
    const query = this.query().trim().toLocaleLowerCase('vi');
    return this.store
      .students()
      .filter(
        (item) =>
          (!this.classFilter() || item.Lop === this.classFilter()) &&
          [item.MaSV, item.HoTen, item.Email, item.Lop].some((value) =>
            value.toLocaleLowerCase('vi').includes(query),
          ),
      );
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set('');
    this.store
      .list()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        error: (error) => this.error.set(apiError(error)),
      });
  }

  openCreate(): void {
    this.current.set(null);
    this.form = this.emptyForm();
    this.error.set('');
    this.message.set('');
    this.mode.set('create');
  }

  openStudent(student: SinhVien, mode: 'detail' | 'edit'): void {
    if (this.busy()) return;
    this.error.set('');
    this.message.set('');
    this.busy.set(true);
    this.store
      .findOne(student.MaSV)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (data) => {
          this.current.set(data);
          this.form = {
            maSV: data.MaSV,
            hoTen: data.HoTen,
            email: data.Email,
            lop: data.Lop,
            matKhau: '',
          };
          this.mode.set(mode);
        },
        error: (error) => this.error.set(apiError(error)),
      });
  }

  askDelete(student: SinhVien): void {
    this.current.set(student);
    this.error.set('');
    this.message.set('');
    this.mode.set('delete');
  }

  close(): void {
    if (this.busy()) return;
    this.mode.set(null);
    this.current.set(null);
    this.form = this.emptyForm();
  }

  save(): void {
    if (this.busy()) return;
    const mode = this.mode();
    if (mode !== 'create' && mode !== 'edit') return;
    const body = {
      ...this.form,
      maSV: this.form.maSV.trim(),
      hoTen: this.form.hoTen.trim(),
      email: this.form.email.trim(),
      lop: this.form.lop.trim(),
    };
    if (!body.maSV || !body.hoTen || !body.email || !body.lop) {
      this.error.set('Vui lòng nhập đầy đủ thông tin, không chỉ khoảng trắng.');
      return;
    }
    const update: UpdateSinhVien = { hoTen: body.hoTen, email: body.email, lop: body.lop };
    if (body.matKhau) update.matKhau = body.matKhau;
    const operation =
      mode === 'create' ? this.store.create(body) : this.store.update(body.maSV, update);
    this.busy.set(true);
    this.error.set('');
    operation
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.message.set(response.message);
          this.mode.set(null);
          this.form = this.emptyForm();
          this.current.set(null);
        },
        error: (error) => this.error.set(apiError(error)),
      });
  }

  remove(): void {
    const student = this.current();
    if (!student || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.store
      .remove(student.MaSV)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.message.set(response.message);
          this.mode.set(null);
          this.current.set(null);
        },
        error: (error) => this.error.set(apiError(error)),
      });
  }

  initials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }
  private emptyForm(): CreateSinhVien {
    return { maSV: '', hoTen: '', email: '', lop: '', matKhau: '' };
  }
}
