import { Component, input, model, computed, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export type InputType = 'text' | 'email' | 'password' | 'number' | 'date';

@Component({
  selector: 'ef-input',
  imports: [FormsModule],
  templateUrl: './input.html',
  styleUrl: './input.scss',
})
export class Input {
  label = input<string>('');
  placeholder = input<string>('');
  type = input<InputType>('text');
  error = input<string>('');
  disabled = input<boolean>(false);
  value = model<string>('');
  blur = output<void>();

  inputClasses = computed(() => {
    const base =
      'w-full px-3.5 py-3 text-sm rounded-md border transition-colors duration-200 outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500';
    const errorClass = this.error()
      ? 'border-error-500 dark:border-red-600 focus:ring-error-500'
      : 'border-neutral-300 dark:border-neutral-600';

    return `${base} ${errorClass}`;
  });
}
