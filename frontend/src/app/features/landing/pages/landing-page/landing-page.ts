import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService } from '@core/services/theme.service';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
})
export class LandingPage {
  protected readonly theme = inject(ThemeService);
  protected readonly mobileMenuOpen = signal(false);

  protected toggleMenu() {
    this.mobileMenuOpen.update((open) => !open);
  }

  protected closeMenu() {
    this.mobileMenuOpen.set(false);
  }
}
