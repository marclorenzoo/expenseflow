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
    const name = this.user()?.name ?? '';
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  });

  logout() {
    this.authService.logout();
  }
}
