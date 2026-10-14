import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { computed } from '@angular/core';
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
  searchCode = '';
  readonly searchId = signal<number | null>(null);
  private readonly searchFound = signal(false);
  readonly visibleItems = computed(() => {
    const id = this.searchId();
    if (id === null) return this.store.items();
    return this.searchFound() ? this.store.items().filter((item) => Number(item.MaDT) === id) : [];
  });
  readonly mode = signal<'create' | 'edit' | 'detail' | 'delete' | null>(null);
  readonly current = signal<DeTai | null>(null);
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
    this.store
      .list()
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
      this.error.set('Mã đề tài phải là số nguyên từ 1 đến 2147483647.');
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
