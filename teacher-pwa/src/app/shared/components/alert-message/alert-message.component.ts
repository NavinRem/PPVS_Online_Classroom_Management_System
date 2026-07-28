import { Component, input, output, signal, effect, OnDestroy } from '@angular/core';

export type AlertType = 'error' | 'success' | 'warning' | 'info';

@Component({
  selector: 'app-alert-message',
  standalone: true,
  templateUrl: './alert-message.component.html',
  styleUrl: './alert-message.component.scss',
})
export class AlertMessageComponent implements OnDestroy {
  type = input<AlertType>('info');
  message = input<string>('');
  dismissible = input<boolean>(true);
  autoDismissMs = input<number>(5000);

  dismiss = output<void>();
  readonly isVisible = signal(true);
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const msg = this.message();
      this.clearTimer();
      if (msg) {
        this.isVisible.set(true);
        if (this.autoDismissMs() > 0) {
          this.timer = setTimeout(() => {
            this.close();
          }, this.autoDismissMs());
        }
      }
    });
  }

  close(): void {
    this.isVisible.set(false);
    this.clearTimer();
    this.dismiss.emit();
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  getIcon(): string {
    switch (this.type()) {
      case 'error':
        return '⚠️';
      case 'success':
        return '✅';
      case 'warning':
        return '🔒';
      case 'info':
      default:
        return 'ℹ️';
    }
  }
}
