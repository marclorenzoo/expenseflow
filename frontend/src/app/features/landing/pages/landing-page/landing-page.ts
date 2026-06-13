import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService } from '@core/services/theme.service';
import { ScrollRevealDirective } from '@shared/directives/scroll-reveal.directive';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, ScrollRevealDirective],
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

  /** Smoothly scrolls to an in-page section, offset for the sticky header. */
  protected scrollTo(event: Event, id: string) {
    event.preventDefault();
    this.closeMenu();

    const headerOffset = 84;
    const target = id === 'top' ? null : document.getElementById(id);
    const top =
      id === 'top'
        ? 0
        : target
          ? target.getBoundingClientRect().top + window.scrollY - headerOffset
          : null;
    if (top === null) return;

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    window.scrollTo({ top, behavior: prefersReduced ? 'auto' : 'smooth' });
  }
}
