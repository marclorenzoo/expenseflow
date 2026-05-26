import { Component, inject } from '@angular/core';
import { ToastService } from '@core/services/toast.service';

type ToastType = 'success' | 'error' | 'info';

@Component({
  selector: 'ef-toast',
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
})
export class Toast {
  protected readonly toasts = inject(ToastService).toasts;

  protected classes(type: ToastType): string {
    const colors: Record<ToastType, string> = {
      success: 'bg-emerald-500 shadow-emerald-500/25',
      error: 'bg-red-500 shadow-red-500/25',
      info: 'bg-blue-500 shadow-blue-500/25',
    };
    return `toast-item flex items-center gap-3 px-4 py-3.5 rounded-xl shadow-lg text-white text-sm font-medium min-w-72 max-w-xs ${colors[type]}`;
  }

  protected icon(type: ToastType): string {
    const icons: Record<ToastType, string> = {
      success: '✓',
      error: '✕',
      info: 'i',
    };
    return icons[type];
  }
}
