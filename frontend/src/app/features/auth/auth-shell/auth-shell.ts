import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import {
  animate,
  group,
  query,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { ThemeService } from '@core/services/theme.service';

/**
 * Route transition for the auth pages: the outgoing card fades out and slides
 * left, while the incoming one fades in and slides from the right — so login
 * and register read as the same card morphing between states.
 */
export const routeFadeAnimation = trigger('routeFade', [
  transition('* <=> *', [
    query(':enter, :leave', [style({ position: 'absolute', width: '100%' })], {
      optional: true,
    }),
    query(':enter', [style({ opacity: 0, transform: 'translateX(20px)' })], {
      optional: true,
    }),
    group([
      query(
        ':leave',
        [
          animate(
            '250ms ease-out',
            style({ opacity: 0, transform: 'translateX(-20px)' }),
          ),
        ],
        { optional: true },
      ),
      query(
        ':enter',
        [
          animate(
            '300ms 100ms ease-out',
            style({ opacity: 1, transform: 'translateX(0)' }),
          ),
        ],
        { optional: true },
      ),
    ]),
  ]),
]);

/**
 * Shared frame for the auth routes (login / register). Owns the page
 * background, the corner buttons and the brand; the swapping card lives in the
 * <router-outlet>. The frame stays put while only the card animates.
 */
@Component({
  selector: 'app-auth-shell',
  imports: [RouterLink, RouterOutlet],
  templateUrl: './auth-shell.html',
  styleUrl: '../auth-frame.scss',
  animations: [routeFadeAnimation],
})
export class AuthShell {
  protected readonly theme = inject(ThemeService);

  /** Disable the route animation when the user prefers reduced motion. */
  protected readonly prefersReducedMotion =
    typeof matchMedia === 'function' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches;

  protected getRouteAnimationData(outlet: RouterOutlet) {
    return outlet?.activatedRouteData?.['animation'];
  }
}
