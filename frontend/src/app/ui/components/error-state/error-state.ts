import { Component, input, output } from '@angular/core';
import { Button } from '@ui/components/button/button';

@Component({
  selector: 'ef-error-state',
  imports: [Button],
  templateUrl: './error-state.html',
})
export class ErrorState {
  title = input<string>('Algo salió mal');
  message = input<string>('');
  onRetry = output<void>();
}
