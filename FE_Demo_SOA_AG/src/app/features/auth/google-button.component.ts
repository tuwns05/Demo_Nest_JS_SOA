import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, inject, NgZone, OnDestroy, output, viewChild } from '@angular/core';
import { API_BASE } from '../../core/api';

interface GoogleIdentity {
  accounts: { id: {
    initialize(options: { client_id: string; callback: (response: { credential: string }) => void }): void;
    renderButton(element: HTMLElement, options: { theme: string; size: string; text: string }): void;
  } };
}

declare global {
  interface Window { google?: GoogleIdentity }
}

let scriptPromise: Promise<void> | undefined;
function loadGoogleScript(): Promise<void> {
  if (window.google) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => { scriptPromise = undefined; reject(new Error('Không tải được Google Sign-In')); };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

@Component({
  selector: 'app-google-button',
  template: `<div #button></div>`,
})
export class GoogleButtonComponent implements AfterViewInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly zone = inject(NgZone);
  private readonly button = viewChild.required<ElementRef<HTMLElement>>('button');
  readonly credential = output<string>();
  readonly failure = output<string>();
  private destroyed = false;

  ngAfterViewInit(): void {
    this.http.get<{ clientId: string }>(API_BASE + '/auth/google/config').subscribe({
      next: async ({ clientId }) => {
        if (!clientId) return;
        try {
          await loadGoogleScript();
          if (this.destroyed) return;
          window.google?.accounts.id.initialize({
            client_id: clientId,
            callback: ({ credential }) => this.zone.run(() => this.credential.emit(credential)),
          });
          window.google?.accounts.id.renderButton(this.button().nativeElement,
            { theme: 'outline', size: 'large', text: 'signin_with' });
        } catch {
          this.zone.run(() => this.failure.emit('Không tải được nút đăng nhập Google.'));
        }
      },
      error: () => this.failure.emit('Không tải được cấu hình Google.'),
    });
  }

  ngOnDestroy(): void { this.destroyed = true; }
}
