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
    const base = 'bg-white rounded-xl border border-neutral-200 shadow-sm';

    const paddings: Record<CardPadding, string> = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    const hover = this.hoverable()
      ? 'transition-shadow duration-200 hover:shadow-md cursor-pointer'
      : '';

    return `${base} ${paddings[this.padding()]} ${hover}`;
  });
}
