import {
  AfterViewInit,
  Directive,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
} from '@angular/core';

@Directive({ selector: '[appDialogFocus]' })
export class DialogFocusDirective implements AfterViewInit, OnDestroy {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly previous = document.activeElement as HTMLElement | null;

  ngAfterViewInit(): void {
    this.element.nativeElement.focus();
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const items = [
      ...this.element.nativeElement.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
      ),
    ];
    const first = items[0];
    const last = items[items.length - 1];
    if (!first) {
      event.preventDefault();
      return;
    }
    if (
      event.shiftKey &&
      (document.activeElement === first || document.activeElement === this.element.nativeElement)
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last || document.activeElement === this.element.nativeElement)
    ) {
      event.preventDefault();
      first.focus();
    }
  }

  ngOnDestroy(): void {
    if (this.previous?.isConnected) this.previous.focus();
  }
}
