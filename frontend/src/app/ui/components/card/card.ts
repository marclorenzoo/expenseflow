import { Component, input, computed } from '@angular/core';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

@Component({
  selector: 'ef-card',
  templateUrl: './card.html',
  styleUrl: './card.scss',
})
export class Card {
  padding = input<CardPadding>('md');
  hoverable = input<boolean>(false);

  cardClasses = computed(() => {
    const base =
      'bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm dark:shadow-neutral-900/20';

    const paddings: Record<CardPadding, string> = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    const hover = this.hoverable()
      ? 'transition duration-200 hover:shadow-md hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none cursor-pointer'
      : '';

    return `${base} ${paddings[this.padding()]} ${hover}`;
  });
}
