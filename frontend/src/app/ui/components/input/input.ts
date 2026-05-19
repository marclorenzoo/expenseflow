import { Component, input, model, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

export type InputType = 'text' | 'email' | 'password' | 'number';

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

  inputClasses = computed(() => {
    const base =
      'w-full px-3.5 py-3 text-sm rounded-md border transition-colors duration-200 outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white';
    const errorClass = this.error()
      ? 'border-error-500 focus:ring-error-500'
      : 'border-neutral-300';

    return `${base} ${errorClass}`;
  });
}
