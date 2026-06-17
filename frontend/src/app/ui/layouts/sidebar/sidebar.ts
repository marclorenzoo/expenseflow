import { Component, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LayoutService } from '../layout.service';
import { RecentGroupsList } from './recent-groups-list/recent-groups-list';

interface NavItem {
  label: string;
  path: string;
  icon: 'dashboard' | 'groups' | 'profile' | 'analytics';
}

@Component({
  selector: 'ef-sidebar',
  imports: [RouterLink, RouterLinkActive, RecentGroupsList],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  protected readonly layout = inject(LayoutService);

  protected readonly navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { label: 'Groups', path: '/groups', icon: 'groups' },
    { label: 'Analytics', path: '/analytics', icon: 'analytics' },
    { label: 'Profile', path: '/profile', icon: 'profile' },
  ];

  protected readonly sidebarClass = computed(() => {
    const classes = ['sidebar'];
    if (this.layout.sidebarCollapsed()) classes.push('sidebar--collapsed');
    if (this.layout.mobileSidebarOpen()) classes.push('sidebar--mobile-open');
    return classes.join(' ');
  });
}
