import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { GroupsStore } from '@core/stores/groups.store';
import { LayoutService } from '../../layout.service';
import { environment } from '@environments/environment';

@Component({
  selector: 'ef-recent-groups-list',
  imports: [NgOptimizedImage, RouterLink, RouterLinkActive],
  templateUrl: './recent-groups-list.html',
  styleUrl: './recent-groups-list.scss',
})
export class RecentGroupsList implements OnInit {
  protected readonly layout = inject(LayoutService);
  private readonly groupsStore = inject(GroupsStore);
  protected readonly imageBaseUrl = environment.socketUrl;

  // Placeholder rows for the first-load skeleton state.
  protected readonly skeletonRows = [0, 1, 2];

  private readonly _loading = signal(true);
  readonly loading = this._loading.asReadonly();

  // 5 grupos más recientes por fecha de creación (descendente).
  readonly recentGroups = computed(() =>
    [...this.groupsStore.groups()]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5),
  );

  // Una sola carga por sesión del sidebar (el componente persiste entre
  // navegaciones al vivir dentro del layout).
  async ngOnInit(): Promise<void> {
    try {
      await this.groupsStore.loadGroups();
    } finally {
      this._loading.set(false);
    }
  }

  protected groupInitial(name: string): string {
    return name.trim().charAt(0).toUpperCase();
  }
}
