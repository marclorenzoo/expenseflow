import { Component, inject, computed } from '@angular/core';
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
  private authService = inject(AuthService);

  protected readonly user = this.authService.user;
  protected readonly initials = computed(() => {
    const user = this.user();
    if (!user) return '';
    const first = user.name?.[0] ?? user.email?.[0] ?? '?';
    return first.toUpperCase();
  });

  logout() {
    this.authService.logout();
  }
}
