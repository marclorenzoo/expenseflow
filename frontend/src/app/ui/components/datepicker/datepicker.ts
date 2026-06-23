import {
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  model,
  signal,
} from '@angular/core';

@Component({
  selector: 'ef-datepicker',
  templateUrl: './datepicker.html',
  styleUrl: './datepicker.scss',
})
export class Datepicker {
  label = input<string>('');
  value = model<string>('');
  testId = input<string>('');

  private readonly el = inject(ElementRef);

  protected isOpen = signal(false);
  protected viewYear = signal(new Date().getFullYear());
  protected viewMonth = signal(new Date().getMonth());

  protected readonly WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    if (!this.el.nativeElement.contains(e.target)) {
      this.isOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    this.isOpen.set(false);
  }

  protected parsedDate = computed(() => {
    const v = this.value();
    if (!v) return null;
    const d = new Date(v + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  });

  protected displayValue = computed(() => {
    const d = this.parsedDate();
    if (!d) return '';
    const label = d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  });

  protected monthLabel = computed(() => {
    const d = new Date(this.viewYear(), this.viewMonth(), 1);
    const label = d.toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric',
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  });

  protected calendarDays = computed(() => {
    const year = this.viewYear();
    const month = this.viewMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDow = firstDay.getDay();
    startDow = startDow === 0 ? 6 : startDow - 1; // Mon=0 … Sun=6

    const days: Array<{ date: Date | null }> = [];

    for (let i = 0; i < startDow; i++) {
      days.push({ date: null });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({ date: new Date(year, month, d) });
    }

    const remainder = days.length % 7;
    if (remainder !== 0) {
      for (let i = 0; i < 7 - remainder; i++) {
        days.push({ date: null });
      }
    }

    return days;
  });

  protected toggle() {
    if (!this.isOpen()) {
      const d = this.parsedDate() ?? new Date();
      this.viewYear.set(d.getFullYear());
      this.viewMonth.set(d.getMonth());
    }
    this.isOpen.update((v) => !v);
  }

  protected isSelected(date: Date | null): boolean {
    if (!date) return false;
    const p = this.parsedDate();
    if (!p) return false;
    return (
      date.getFullYear() === p.getFullYear() &&
      date.getMonth() === p.getMonth() &&
      date.getDate() === p.getDate()
    );
  }

  protected isToday(date: Date | null): boolean {
    if (!date) return false;
    const t = new Date();
    return (
      date.getFullYear() === t.getFullYear() &&
      date.getMonth() === t.getMonth() &&
      date.getDate() === t.getDate()
    );
  }

  protected selectDay(date: Date | null) {
    if (!date) return;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    this.value.set(`${y}-${m}-${d}`);
    this.isOpen.set(false);
  }

  protected prevMonth() {
    if (this.viewMonth() === 0) {
      this.viewMonth.set(11);
      this.viewYear.update((y) => y - 1);
    } else {
      this.viewMonth.update((m) => m - 1);
    }
  }

  protected nextMonth() {
    if (this.viewMonth() === 11) {
      this.viewMonth.set(0);
      this.viewYear.update((y) => y + 1);
    } else {
      this.viewMonth.update((m) => m + 1);
    }
  }
}
