import { Component, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { LayoutService } from '../layout.service';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'ef-topbar',
  imports: [],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class Topbar {
  protected readonly layout = inject(LayoutService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.user;
  protected readonly initials = computed(() => {
    const user = this.user();
    if (!user) return '';
    const first = user.name?.[0] ?? user.email?.[0] ?? '?';
    return first.toUpperCase();
  });

  protected navigateToProfile() {
    this.router.navigate(['/profile']);
  }

  logout() {
    this.auth.logout();
  }
}
