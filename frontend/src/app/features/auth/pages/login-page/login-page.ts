import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ThemeService } from '@core/services/theme.service';

@Component({
  selector: 'app-login-page',
  imports: [RouterLink],
  templateUrl: './login-page.html',
  styleUrl: '../../auth-frame.scss',
})
export class LoginPage {
  private authService = inject(AuthService);
  protected readonly theme = inject(ThemeService);

  error = this.authService.error;
  email = signal('');
  password = signal('');
  showPassword = signal(false);

  togglePassword() {
    this.showPassword.update((v) => !v);
  }

  async onSubmit() {
    await this.authService.login(this.email(), this.password());
  }
}
