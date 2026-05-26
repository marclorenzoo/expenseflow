import { Injectable, signal } from '@angular/core';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string; // para poder eliminarlo
  message: string; // el texto
  type: ToastType; // success | error | info
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);

  show(message: string, type: ToastType = 'info') {
    const toast: Toast = {
      id: crypto.randomUUID(),
      message,
      type,
    };

    this.toasts.update((currentToasts) => [...currentToasts, toast]);

    setTimeout(() => {
      this.toasts.update((current) => current.filter((t) => t.id !== toast.id));
    }, 3000);
  }
}
