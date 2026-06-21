import { Component, input, computed } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'ef-button',
  templateUrl: './button.html',
  styleUrl: './button.scss',
})
export class Button {
  variant = input<ButtonVariant>('primary');
  size = input<ButtonSize>('md');
  disabled = input<boolean>(false);
  loading = input<boolean>(false);
  type = input<'button' | 'submit' | 'reset'>('button');
  full = input<boolean>(false);
  extraClass = input<string>('');

  buttonClasses = computed(() => {
    const base =
      'inline-flex items-center justify-center gap-2 font-medium rounded-md transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:-translate-y-px enabled:active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none';

    const variants: Record<ButtonVariant, string> = {
      primary:
        'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
      secondary:
        'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 active:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600 dark:active:bg-neutral-500',
      ghost:
        'bg-transparent text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-700/60 dark:active:bg-neutral-700',
      danger: 'bg-error-500 text-white hover:bg-red-600 active:bg-red-700',
    };

    const sizes: Record<ButtonSize, string> = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    const fullClass = this.full() ? 'w-full' : '';

    return `${base} ${variants[this.variant()]} ${sizes[this.size()]} ${fullClass} ${this.extraClass()}`.trim();
  });
}
