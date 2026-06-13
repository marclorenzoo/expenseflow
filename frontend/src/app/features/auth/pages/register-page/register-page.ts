import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-register-page',
  imports: [RouterLink],
  templateUrl: './register-page.html',
  styleUrl: '../../auth-frame.scss',
})
export class RegisterPage {
  private authService = inject(AuthService);

  error = this.authService.error;
  name = signal('');
  email = signal('');
  password = signal('');
  showPassword = signal(false);

  togglePassword() {
    this.showPassword.update((v) => !v);
  }

  async onRegister() {
    await this.authService.register(this.name(), this.email(), this.password());
  }
}
