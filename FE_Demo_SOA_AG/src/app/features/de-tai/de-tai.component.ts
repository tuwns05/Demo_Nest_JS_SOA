import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { apiError } from '../../core/api';
import { DialogFocusDirective } from '../../shared/dialog-focus.directive';
import { DeTai, DeTaiBody, DeTaiService } from './de-tai.service';

@Component({
  selector: 'app-de-tai',
  imports: [FormsModule, DialogFocusDirective],
  templateUrl: './de-tai.component.html',
})
export class DeTaiComponent implements OnInit {
  readonly store = inject(DeTaiService);

  private readonly destroyRef = inject(DestroyRef);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly mode = signal<'create' | 'edit' | 'detail' | 'delete' | null>(null);
  readonly current = signal<DeTai | null>(null);
  form = this.emptyForm();

  ngOnInit() {
    this.reload();
  }

  reload() {
    if (this.loading() || this.busy()) return;
    this.loading.set(true);
    this.error.set('');
    this.store
      .list()
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

  open(item: DeTai, mode: 'edit' | 'detail') {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    this.store
      .findOne(item.MaDT)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (data) => {
          this.current.set(data);
          this.form = {
            tenDT: data.TenDT,
            moTa: data.MoTa ?? '',
            giangVienHD: data.GiangVienHD ?? '',
          };
          this.mode.set(mode);
        },
        error: (error) => this.error.set(apiError(error)),
      });
  }

  askDelete(item: DeTai) {
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
    if (!this.form.tenDT.trim()) {
      this.error.set('Vui lòng nhập tên đề tài.');
      return;
    }
    const body: DeTaiBody = {
      tenDT: this.form.tenDT.trim(),
      moTa: this.form.moTa.trim() || null,
      giangVienHD: this.form.giangVienHD.trim() || null,
    };
    const operation =
      mode === 'create' ? this.store.create(body) : this.store.update(this.current()!.MaDT, body);
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
      .remove(item.MaDT)
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
    return { tenDT: '', moTa: '', giangVienHD: '' };
  }
}
