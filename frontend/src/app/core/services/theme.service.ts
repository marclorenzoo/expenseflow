import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<'light' | 'dark'>('light');

  constructor() {
    const saved = localStorage.getItem('ef-theme') as 'light' | 'dark' | null;
    const initial = saved ?? 'light';
    this.theme.set(initial);
    this.applyTheme(initial);

    effect(() => {
      const t = this.theme();
      this.applyTheme(t);
      localStorage.setItem('ef-theme', t);
    });
  }

  toggle() {
    this.theme.update((t) => (t === 'light' ? 'dark' : 'light'));
  }

  setTheme(theme: 'light' | 'dark') {
    this.theme.set(theme);
  }

  private applyTheme(theme: 'light' | 'dark') {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}
