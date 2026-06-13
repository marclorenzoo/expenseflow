import {
  Directive,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';

/**
 * [scrollReveal] — reveals the host element with a fade-up when it scrolls
 * into the viewport. The reveal runs once; after firing, the observer is
 * disconnected so scrolling back up and down again won't replay it.
 *
 * Purely presentational: pair it with the `[scrollReveal]` / `.is-visible`
 * CSS rules (see landing-page.scss). Respecting `prefers-reduced-motion` is
 * handled in CSS, which keeps the element visible with no transition.
 */
@Directive({
  selector: '[scrollReveal]',
})
export class ScrollRevealDirective implements OnInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  ngOnInit(): void {
    // SSR / very old browsers: just show the element with no animation.
    if (typeof IntersectionObserver === 'undefined') {
      this.host.nativeElement.classList.add('is-visible');
      return;
    }

    this.observer = new IntersectionObserver(
      (entries, observer) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px',
      },
    );

    this.observer.observe(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
