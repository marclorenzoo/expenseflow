import { Component, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LayoutService } from '../layout.service';

interface NavItem {
  label: string;
  path: string;
  icon: 'dashboard' | 'groups' | 'profile';
}

@Component({
  selector: 'ef-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  protected readonly layout = inject(LayoutService);

  protected readonly navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { label: 'Groups', path: '/groups', icon: 'groups' },
    { label: 'Profile', path: '/profile', icon: 'profile' },
  ];

  protected readonly sidebarClass = computed(() => {
    const classes = ['sidebar'];
    if (this.layout.sidebarCollapsed()) classes.push('sidebar--collapsed');
    if (this.layout.mobileSidebarOpen()) classes.push('sidebar--mobile-open');
    return classes.join(' ');
  });
}
