import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'ef-empty-state',
  templateUrl: './empty-state.html',
})
export class EmptyState {
  title = input<string>('');
  description = input<string>('');
  size = input<'sm' | 'md'>('md');

  containerClass = computed(() =>
    this.size() === 'sm'
      ? 'flex flex-col items-center gap-3 py-8 px-4 text-center'
      : 'flex flex-col items-center gap-5 py-16 px-6 text-center',
  );

  iconClass = computed(() =>
    this.size() === 'sm'
      ? 'w-[48px] h-[48px] rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-shrink-0'
      : 'w-[72px] h-[72px] rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-shrink-0',
  );

  titleClass = computed(() =>
    this.size() === 'sm'
      ? 'text-sm font-semibold text-neutral-800 dark:text-neutral-200 tracking-tight'
      : 'text-[17px] font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight leading-snug',
  );
}
