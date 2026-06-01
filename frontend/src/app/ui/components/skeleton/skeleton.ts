import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'ef-skeleton',
  host: { class: 'block' },
  template: `<div
    [class]="classes()"
    [style.height]="height()"
    [style.width]="width()"
  ></div>`,
})
export class Skeleton {
  width = input<string>('100%');
  height = input<string>('1rem');
  rounded = input<'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'>('md');

  classes = computed(() => {
    const rounding: Record<string, string> = {
      none: 'rounded-none',
      sm: 'rounded',
      md: 'rounded-md',
      lg: 'rounded-lg',
      xl: 'rounded-xl',
      full: 'rounded-full',
    };
    return `animate-pulse bg-neutral-200 dark:bg-neutral-700 ${rounding[this.rounded()]}`;
  });
}
