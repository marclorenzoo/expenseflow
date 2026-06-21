import { Component, inject, signal, OnInit } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Router } from '@angular/router';
import { GroupsStore, Group } from '@core/stores/groups.store';
import { Button } from '@ui/components/button/button';
import { Input } from '@ui/components/input/input';
import { Skeleton } from '@ui/components/skeleton/skeleton';
import { ErrorState } from '@ui/components/error-state/error-state';
import { ToastService } from '@core/services/toast.service';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-groups-page',
  imports: [NgOptimizedImage, Button, Input, Skeleton, ErrorState],
  templateUrl: './groups-page.html',
  styleUrl: './groups-page.scss',
})
export class GroupsPage implements OnInit {
  protected readonly groupsStore = inject(GroupsStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly imageBaseUrl = environment.socketUrl;

  protected loading = signal(true);
  protected loadError = signal('');

  protected showCreateModal = signal(false);
  protected creating = signal(false);
  protected createError = signal('');
  protected newName = signal('');
  protected newDescription = signal('');

  async ngOnInit() {
    this.loading.set(true);
    this.loadError.set('');
    await this.groupsStore.loadGroups();
    if (this.groupsStore.error()) {
      this.loadError.set(
        'No se pudieron cargar los grupos. Comprueba tu conexión e inténtalo de nuevo.',
      );
    }
    this.loading.set(false);
  }

  protected retry() {
    this.ngOnInit();
  }

  protected openCreateModal() {
    this.newName.set('');
    this.newDescription.set('');
    this.createError.set('');
    this.showCreateModal.set(true);
  }

  protected closeCreateModal() {
    if (this.creating()) return;
    this.showCreateModal.set(false);
  }

  protected async submitCreate() {
    const name = this.newName().trim();
    if (!name) return;

    this.creating.set(true);
    this.createError.set('');

    try {
      const group = await this.groupsStore.createGroup({
        name,
        description: this.newDescription(),
      });
      this.showCreateModal.set(false);
      this.toast.show(
        'Grupo creado. Empieza añadiendo el primer gasto.',
        'success',
      );
      this.router.navigate(['/groups', group.id]);
    } catch (err: any) {
      this.createError.set(
        err.error?.message ||
          'No hemos podido crear el grupo. Inténtalo de nuevo.',
      );
    } finally {
      this.creating.set(false);
    }
  }

  protected navigateToGroup(group: Group) {
    this.router.navigate(['/groups', group.id]);
  }

  protected groupInitials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }
}
