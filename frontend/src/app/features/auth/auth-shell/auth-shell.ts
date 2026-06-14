import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { ThemeService } from '@core/services/theme.service';

/**
 * Shared frame for the auth routes (login / register). Owns the page
 * background, the corner buttons and the brand; the routed card lives in the
 * <router-outlet>.
 */
@Component({
  selector: 'app-auth-shell',
  imports: [RouterLink, RouterOutlet],
  templateUrl: './auth-shell.html',
  styleUrl: '../auth-frame.scss',
})
export class AuthShell {
  protected readonly theme = inject(ThemeService);
}
